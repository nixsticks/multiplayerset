require 'bundler'
Bundler.require

Dir.glob('./lib/*.rb') do |model|
  require model
end

module SetGame
  class App < Sinatra::Application
    configure do
      set :root, File.dirname(__FILE__)
      set :public_folder, 'public'
    end

    redis = Redis.new

    get "/css/set.css" do
      scss :set
    end

    get '/' do
      haml :index
    end

    get '/set/:game_id' do
      if redis.get(params[:game_id])
        @cards = YAML::load(redis.get(params[:game_id]))
      else
        deck = Deck.new("data/set.yml")
        @cards = deck.cards.shuffle
        redis.set(params[:game_id], YAML::dump(@cards))
      end

      haml :set
    end

    helpers do
      def partial(template,locals=nil)
        if template.is_a?(String) || template.is_a?(Symbol)
          template = :"_#{template}"
        else
          locals=template
          template = template.is_a?(Array) ? :"_#{template.first.class.to_s.downcase}" : :"_#{template.class.to_s.downcase}"
        end
        if locals.is_a?(Hash)
          haml template, {}, locals      
        elsif locals
          locals=[locals] unless locals.respond_to?(:inject)
          locals.inject([]) do |output,element|
            output << haml(template,{template.to_s.delete("_").to_sym => element})
          end.join("\n")
        else 
          haml template
        end
      end
    end
  end
end