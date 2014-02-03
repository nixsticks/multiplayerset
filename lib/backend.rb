require 'faye/websocket'
require 'thread'

class Backend
  KEEPALIVE_TIME = 15

  MUTEX = Mutex.new

  def initialize(app)
    @app = app
    @clients = {}
  end

  def call(env)
    if Faye::WebSocket.websocket?(env)
      ws = Faye::WebSocket.new(env, nil, {ping: KEEPALIVE_TIME})

      ws.on :open do |event|
        p [:open, ws.object_id]
        MUTEX.synchronize {@clients[ws] = "Anonymous"}
      end

      ws.on :message do |event|
        p [:message, event.data]
        message = JSON.parse(event.data)
        MUTEX.synchronize {
          @clients[ws] = message["room"]
          @clients.each {|client, room| client.send(event.data) if ws != client && room == message["room"]}
        }
      end

      ws.on :close do |event|
        p [:close, ws.object_id, event.code, event.reason]
        MUTEX.synchronize {
          leaver = @clients[ws]
          @clients.delete(ws)
        }
        ws = nil
      end

      ws.rack_response
    else
      @app.call(env)
    end
  end
end