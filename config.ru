require './app'
require './lib/backend'

use Backend

use Faye::RackAdapter, :mount => '/faye', :timeout => 25

run SetGame::App