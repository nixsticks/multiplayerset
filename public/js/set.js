var scheme          = "ws://";
var uri             = scheme + window.document.location.host + "/faye";
var ws              = new WebSocket(uri);
var room            = location.pathname;
var $scoreContainer = $(".score h3").first();
var $youAre         = $(".score h3").last();
var $button         = $(".button");
var gameStarted     = false;
var scores;
var players;
var playerNumber;

ws.onopen = function(event) {
  ws.send(JSON.stringify({command: "getPlayers", room: room}))
  setTimeout(function(){
    if (!players) {
      players = 1, playerNumber = 1;
      $youAre.text("you are player 1");
      scores = {1: 0};
    }
  }, 500);
}

function updatePlayers(number) {
  $(".players h3").last().append("<h3 id=" + players + "> player " + number + ": 0");
}

$(window).unload(function() {
  ws.send(JSON.stringify({command: "leave", room: room, player: playerNumber}));
});

$(document).ready(function() {
  var $card = $("div.card");

  countSets();

  $card.on("click", function() {
    var $this = $(this);
    var $chosen;

    $this.toggleClass("chosen");
    $chosen = $(".chosen");

    if ($chosen.length === 3) {
      if (isASet($chosen)) {
        var ids = jQuery.makeArray(mapTraits($chosen, "id"));
        console.log(ids);
        removeSet($chosen);
        updateScore();
        ws.send(JSON.stringify({command: "removeSet", room: room, ids: ids, player: playerNumber}));
      } else {
        $chosen.removeClass("chosen");
      }
    }
  });

  $button.on("click", function() {
    shuffleCards();
    ws.send(JSON.stringify({command: "shuffleCards", room: room}));
  });

  $(".start").on("click", function() {
    gameStarted = true;
    $("div.board").removeClass("hidden");
    $(this).hide();
    ws.send(JSON.stringify({command: "start", room: room}))
  })
});

ws.onmessage = function(message) {
  var data = JSON.parse(message.data);

  if (data.room === room) {
    switch(data.command) {
      case "getPlayers":
        players += 1;
        scores[players] = 0;
        $(".players").append("<h3 id='" + players + "''>player " + players + ": 0");
        ws.send(JSON.stringify({command: "setPlayers", room: room, players: players, scores: scores}));
        break;
      case "setPlayers":
        if (playerNumber === undefined) {
          players = data.players;
          playerNumber = data.players;
          scores = data.scores;

          $(".players").empty();

          for (var key in scores) {
            if (scores.hasOwnProperty(key)) {
              $(".players").append("<h3 id='" + key + "''>player " + key + ": " + scores[key]);
            }
          }

          $youAre.text("you are player " + playerNumber);
        }
        break;
      case "start":
        gameStarted = true;
        $("div.board").removeClass("hidden");
        $(".start").hide();
        break;
      case "removeSet":
        var $cards = $(".board div.card");
        var set = data.ids.map(function(id){
          return $("[data-id='" + id + "']");
        });
        removeSet($(set).map (function () {return this.toArray(); } ));
        scores[data.player] += 1;
        $("#" + data.player).text("player " + data.player + ": " + scores[data.player]);
        break;
      case "shuffleCards":
        shuffleCards();
        break;
      case "leave":
        $("#" + data.player).text("player " + data.player + " left the game");
        break;
    }
  }
}

function updateScore() {
  scores[playerNumber] += 1;
  $("#" + playerNumber).text("player " + playerNumber + ": " + scores[playerNumber]);
}

function countSets() {
  var sets = findSets();
  if (sets === 0) {
    if ($(".card").length < 13) {
      var winner = findWinner();
      $youAre.text("player " + winner + " won the game!");
    } else { 
      $button.fadeIn();
    }
  } else {
    $button.fadeOut();
  }
}

function shuffleCards() {
  var $hiddenCards = $(".hidden div.card");
  if ($hiddenCards.length <= 12) {
    $hiddenCards.slice(0, 3).wrapAll("<div class='row'></div>");
    var $rows = $(".row");
    $rows.last().insertAfter($rows.eq(-2));
  } else {
    var $cardsOnTable = $(".board div.card");
    var $newCards = $hiddenCards.slice(0, 13);

    for (var i = 0; i < 13; i++) {
      var $oldCard = $cardsOnTable.eq(i);
      var $newCard = $newCards.eq(i);
      
      $newCard.insertAfter($oldCard);
      $oldCard.insertAfter($(".hidden div.card").last());
    }
  }
  $button.fadeOut();
  countSets();
}

function removeSet(set) {
  var score = parseInt($scoreContainer.text().match(/\d+/g));
  $scoreContainer.text("cards remaining: " + (score - 3));

  set.fadeOut("slow", function(){
    $(this).replaceWith($(".hidden .card").first());
    countSets();
    $(this).fadeIn("slow");
  });
}

function findSets() {
  var counter = 0;
  var $cardsOnTable = $(".board div.card").not(".chosen");
  
  var set = jQuery.makeArray($cardsOnTable);
  var combinations = k_combinations(set, 3);

  for (var i = 0, combination; combination = combinations[i]; i++) {
    if (isASet($(combination))) { counter++; }
  }

  return counter;
}

function isASet(cards) {
  var numbers = mapTraits(cards, "number");
  var shapes = mapTraits(cards, "shape");
  var shades = mapTraits(cards, "shade");
  var colors = mapTraits(cards, "color");

  if (twoOfOne(numbers) || twoOfOne(shapes) || twoOfOne(shades) || twoOfOne(colors)) {
    return false;
  } else {
    return true;
  }
}

function twoOfOne(array) {
  return (jQuery.unique(array).length === 2);
}

function mapTraits(collection, trait) {
  return collection.map(function() { return $(this).data(trait); });
}

function findWinner() {
  var highest = scores[1];
  var winner = 1;

  for (var key in scores) {
    if (scores.hasOwnProperty(key)) {
      if (scores[key] > highest) {
        highest = scores[key];
        winner = key;
      }
    }
  }

  return winner;
}

function k_combinations(set, k) {
  //taken from https://gist.github.com/axelpale
  var i, j, combs, head, tailcombs;
  
  if (k > set.length || k <= 0) { return []; }
  if (k == set.length) { return [set]; }
  if (k == 1) {
    combs = [];
    for (i = 0; i < set.length; i++) { combs.push([set[i]]); }
    return combs;
  }
  
  combs = [];
  for (i = 0; i < set.length - k + 1; i++) {
    head = set.slice(i, i+1);
    tailcombs = k_combinations(set.slice(i + 1), k - 1);
    for (j = 0; j < tailcombs.length; j++) { combs.push(head.concat(tailcombs[j])); }
  }
  return combs;
}