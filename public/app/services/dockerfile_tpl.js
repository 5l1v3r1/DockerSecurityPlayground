DockerFilesService: function DockerFilesService($log, $http, containerManager, Notification)
{

  var tplAction = hereDoc(function() {/*#!/bin/bash
# Author:       dsp
# Date:
# Usage:       {{{nameCommand}}} [{{{listCommands}}} ]
# Description: {{{description}}}


usage() {
echo $1
echo "Usage {{{nameCommand}}} [{{{listCommands}}}] "
exit 1
}

{{{commandBoolParsed}}}
optspec=":-:"
while getopts "$optspec" optchar; do
  case "${optchar}" in
  -)
    case "${OPTARG}" in
{{{commandsParsed}}}
                                       *)
    usage
    ;;
    esac;;
                                       *)
    usage
    ;;
  esac
done

{{{conditionBoolParsed}}}


# Execute the command
{{{commandExample}}}

*/})


  function withoutExtension(a) {
    if (!a.includes(".")) {
      return a;
    } else {
      return a.split('.').slice(0, -1).join('.')
    }
  }

  function getArgLabel(nameCommand, a) {
    var ret = "actions."+ withoutExtension(nameCommand) + ".args." + a + ".val=\"\"\n" +
      "actions."+ withoutExtension(nameCommand) + ".args." + a + ".type=\"text\"\n"
    return ret;
  }
  function hereDoc(f) {
    return f.toString().
      replace(/^[^\/]+\/\*!?/, '').
      replace(/\*\/[^\/]+$/, '');
  }
  function parseCommand(action, nameCommand) {
    return action.replace(/\{\{\{nameCommand\}\}\}/g, nameCommand);
  }
  function parseDescription(action, descr) {
    return action.replace(/\{\{\{description\}\}\}/g, descr);
  }

  function getBoolParsed(a) {
    return a+"_bool=false\n"
  }
  function getConditionBoolParsed(a) {
    return "if [ $"+ a +"_bool != true ] ; then\n"+
      "\tusage 'no "+ a +"'\n"  +
      "fi\n";
  }
  function getCommandExample(a) {
    return "echo $" + a + ";\n"
  }

  function getArgOption(arg) {
    return "\t" + arg + ")\n" +
      "\t" + arg + '="${!OPTIND}"; OPTIND=$(( $OPTIND + 1 ))\n' +
      "\t" +  '[[ ! -z "${'+arg+'// }"  ]] && '+ arg +'_bool=true || usage \'Empty '+arg+'\'\n' +
      "\t" + ";;" + "\n\n"
  }
  function parseArguments(action, args) {
    var commandInfo = "";
    var commandParse = "";
    var commandBoolParsed = "";
    var conditionBoolParsed = "";
    var commandExample = "";
    args.forEach(function(a) {
      commandInfo += "--" + a + " <" + a + "> ";
      commandBoolParsed += getBoolParsed(a)
      conditionBoolParsed += getConditionBoolParsed(a);
      commandParse += getArgOption(a);
      commandExample += getCommandExample(a);
    })

    // Replace {{{listCommands}}}
    action = action.replace(/\{\{\{listCommands\}\}\}/g, commandInfo);
    action = action.replace(/\{\{\{commandBoolParsed\}\}\}/g, commandBoolParsed);
    action = action.replace(/\{\{\{commandsParsed\}\}\}/g, commandParse);
    action = action.replace(/\{\{\{conditionBoolParsed\}\}\}/g, conditionBoolParsed);
    action = action.replace(/\{\{\{commandExample\}\}\}/g, commandExample);
    return action;
  }

  return {
    getActionTemplate : function getActionTemplate(nameCommand, description, args) {
      var  parsedAction = tplAction;
      parsedAction = parseCommand(parsedAction, nameCommand);
      parsedAction = parseDescription(parsedAction, description);
      parsedAction = parseArguments(parsedAction, args);
      return parsedAction;
    },
    getLabelTemplate : function getLabelTemplate(nameCommand, description, args) {
      var parsedLabel = "";
      parsedLabel = "actions." + withoutExtension(nameCommand) + ".command=" + nameCommand + "\\ \n";
      if (description !== "") {
        parsedLabel += "actions." + withoutExtension(nameCommand) + ".description=" + description + "\\ \n";
      }
      var argsRet = ""
      args.forEach(function(a) {
        argsRet += getArgLabel(nameCommand, a);
      })
      parsedLabel += argsRet;
      return {
        parsedCopyLabel : "COPY " + nameCommand + "/ \n",
        parsedLabel: parsedLabel
      }
    },
    withoutExtension : withoutExtension,
    appendToDockerfile : function appendToDockerfile(dockerfile, labelAction) {
      if(dockerfile.content.includes("LABEL")) {
        var dockerfileContent = this.appendAfter(dockerfile.content, "LABEL", labelAction.parsedLabel);
        dockerfileContent = this.appendBefore(dockerfile.content, "LABEL", labelAction.parsedCopyLabel);
        dockerfile.content = dockerfileContent;
      } else {
        dockerfile.content = this.appendToTheEnd(dockerfile.content, labelAction.parsedCopyLabel + "LABEL \\ \n" + labelAction);
      }
      console.log(dockerfile.content);
    },
    appendToTheEnd : function appendToDockerfile(s, toAppend) {
      var lines = s.split("\n");
      lines.push(toAppend);
      console.log("lines");
      console.log(lines);
      return lines.join("\n");

    },

    appendBefore: function appendAfter(s, beforeString, toAppend) {
      var lines = s.split("\n");
      var indexBefore = -1;
      for (var i = 0; i < lines.length; i++) {
        if (lines[i].includes(beforeString)) {
          indexBefore = i-1;
        }
      }
      if(indexBefore >= -1) {
        lines.splice(indexBefore + 1, 0, toAppend)
      }
      return lines.join("\n");
    },
    appendAfter: function appendAfter(s, afterString, toAppend) {
      var lines = s.split("\n");
      var indexBefore = -1;
      for (var i = 0; i < lines.length; i++) {
        if (lines[i].includes(afterString)) {
          indexBefore = i;
        }
      }
      if(indexBefore >= 0) {
        lines.splice(indexBefore + 1, 0, toAppend)
      }
      return lines.join("\n");
    }
  }
}
