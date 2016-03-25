var GameServer = require('../GameServer');
var chalk = require('chalk');

function Commands() {
  this.list = {}; // Empty
}

module.exports = Commands;

// Utils
var fillChar = function(data, char, fieldLength, rTL) {
  var result = data.toString();
  if (rTL === true) {
    for (var i = result.length; i < fieldLength; i++)
      result = char.concat(result);
  } else {
    for (var i = result.length; i < fieldLength; i++)
      result = result.concat(char);
  }
  return result;
};

// Commands
Commands.list = {
  help: function(gameServer, split, serverNames) {
    console.log("======================== HELP ======================");
    console.log("server [list | add | remove]        : manage servers");
    console.log("status                              : show server status ('usage' have to be installed)");
    console.log("exit                                : stop the game");
    console.log("====================================================");
  },
  exit: function(gameServer, split, serversNames) {
    console.log(chalk.blue("[Console]") + " Closing server...");
    process.exit(1);
  },
  server: function(gameServer, split, serversNames) {
    if (split[1] == "list") {
      console.log(chalk.blue("[Console]") + " Showing " + serversNames.length + " servers:");
      
      for (var i = 0; i < serversNames.length; i++) {
        var name = serversNames[i];
        console.log(name + " " + gameServer[name].fishLength + "/" + gameServer[name].config.maxPlayers);
      }
    } else if (split[1] == "create") {
      var serverName = split[2];
      if (serverName == "") {
        console.log(chalk.blue("[Console]") + " Please specify a server name!");
        return;
      }
      
      for (var i = 0; i < gameServer.length; i++)
        if (gameServer[i].serverName == serverName) {
          console.log(chalk.blue("[Console]") + " A server with this name already exist!");
          return;
        }
        
      gameServer[serverName] = new GameServer();
      gameServer[serverName].start(serverName);
      
      serversNames.push(serverName);

      console.log(chalk.blue("[Console]") + " Server created");
    } else if (split[1] == "delete") {
      var serverName = split[2];
      
      if (serverName == "") {
        console.log(chalk.blue("[Console]") + " Please specify a server name!");
        return;
      }
      
      if (gameServer[serverName] != undefined) {
        if (serversNames.length <= 1)
          console.log(chalk.blue("[Console]") + " You can't delete all servers!");
        else {
          gameServer[serverName] = undefined;
          serversNames.splice(serversNames.indexOf(serverName), 1);
          
          console.log(chalk.blue("[Console]") + " Server deleted!");
        }
      } else
        console.log(chalk.blue("[Console]") + " Server not found!");
    } else {
      console.log(chalk.blue("[Console]") + " server [list | create | delete]");
    }
  },
  status: function(gameServer, split, serverNames) {
    var usage = require('usage');
    var pid = process.pid;
    usage.lookup(pid, function(err, result) {
      // By unknow reason the status will pe printed after that '>', so clear the line
      process.stdout.clearLine();
      process.stdout.cursorTo(0);

      console.log(chalk.red("[Status]") + " Current memory used: " + Math.floor(result.memory / 10000) / 100 + "MB");
      console.log(chalk.red("[Status]") + " Current cpu load: " + Math.floor(result.cpu) + "\%");

      process.stdout.write(">");
    });
  }
};
