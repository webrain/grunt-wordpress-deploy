'use strict';

exports.init = function (grunt) {
  var shell = require('shelljs');
  var lineReader = require("line-reader");

  var exports = {};

  exports.db_dump = function(config, output_paths) {
    grunt.file.mkdir(output_paths.dir);

    var cmd = exports.mysqldump_cmd(config);

    var output = shell.exec(cmd, {silent: true}).output;

    grunt.file.write(output_paths.file, output);
    grunt.log.oklns("Database DUMP succesfully exported to: " + output_paths.file);
  };

  exports.db_import = function(config, src) {
    shell.exec(exports.mysql_cmd(config, src));
    grunt.log.oklns("Database imported succesfully");
  };

  exports.rsync_push = function(config) {
    grunt.log.oklns("Syncing data from '" + config.from + "' to '" + config.to + "' with rsync.");

    var cmd = exports.rsync_push_cmd(config);
    grunt.log.writeln(cmd);

    shell.exec(cmd);

    grunt.log.oklns("Sync completed successfully.");
  };

  exports.rsync_pull = function(config) {
    grunt.log.oklns("Syncing data from '" + config.from + "' to '" + config.to + "' with rsync.");

    var cmd = exports.rsync_pull_cmd(config);
    shell.exec(cmd);

    grunt.log.oklns("Sync completed successfully.");
  };

  exports.generate_backup_paths = function(target, task_options) {

    var backups_dir = task_options['backups_dir'] || "backups";

    var directory = grunt.template.process(tpls.backup_path, {
      data: {
        backups_dir: backups_dir,
        env: target,
        date: grunt.template.today('yyyymmdd'),
        time: grunt.template.today('HH-MM-ss'),
      }
    });

    var filepath = directory + '/db_backup.sql';

    return {
      dir: directory,
      file: filepath
    };
  };

  exports.compose_rsync_options = function(options) {
    var args = options.join(' ');

    return args;
  };

  exports.compose_rsync_exclusions = function(options) {
    var exclusions = '';
    var i = 0;

    for(i = 0;i < options.length; i++) {
      exclusions += "--exclude '" + options[i] + "' ";
    }

    exclusions = exclusions.trim();

    return exclusions;
  };

  exports.db_adapt = function(old_url, new_url, file) {
    grunt.log.oklns("Adapt the database: set the correct urls for the destination in the database.");
    var content = grunt.file.read(file);

    var output = exports.replace_urls(old_url, new_url, content);

    grunt.file.write(file, output);
  };

  exports.replace_urls = function(search, replace, content) {
    content = exports.replace_urls_in_serialized(search, replace, content);
    content = exports.replace_urls_in_string(search, replace, content);

    return content;
  };

  exports.replace_urls_in_serialized = function(search, replace, string) {
    var length_delta = search.length - replace.length;
    var search_regexp = new RegExp(search, 'g');

    // Replace for serialized data
    var matches, length, delimiter, old_serialized_data, target_string, new_url, occurences;
    var regexp = /s:(\d+):([\\]*['"])(.*?)\2;/g;

    while (matches = regexp.exec(string)) {
      old_serialized_data = matches[0];
      target_string = matches[3];

      // If the string contains the url make the substitution
      if (target_string.indexOf(search) !== -1) {
        occurences = target_string.match(search_regexp).length;
        length = matches[1];
        delimiter = matches[2];

        // Replace the url
        new_url = target_string.replace(search_regexp, replace);
        length -= length_delta * occurences;

        // Compose the new serialized data
        var new_serialized_data = 's:' + length + ':' + delimiter + new_url + delimiter + ';';

        // Replace the new serialized data into the dump
        string = string.replace(old_serialized_data, new_serialized_data);
      }
    }

    return string;
  };

  exports.replace_urls_in_string = function (search, replace, string) {
    var regexp = new RegExp('(?!' + replace + ')(' + search + ')', 'g');
    return string.replace(regexp, replace);
  };

  /* Commands generators */
  exports.mysqldump_cmd = function(config) {
    var cmd = grunt.template.process(tpls.mysqldump, {
      data: {
        user: config.user,
        pass: config.pass,
        database: config.database,
        host: config.host
      }
    });

    if (typeof config.ssh_host === "undefined") {
      grunt.log.oklns("Creating DUMP of local database");
    } else {
      grunt.log.oklns("Creating DUMP of remote database");
      var tpl_ssh = grunt.template.process(tpls.ssh, {
        data: {
          host: config.ssh_host
        }
      });
      cmd = tpl_ssh + " '" + cmd + "'";
    }

    return cmd;
  };

  exports.mysql_cmd = function(config, src) {
    var cmd = grunt.template.process(tpls.mysql, {
      data: {
        host: config.host,
        user: config.user,
        pass: config.pass,
        database: config.database,
        path: src
      }
    });

    if (typeof config.ssh_host === "undefined") {
      grunt.log.oklns("Importing DUMP into local database");
      cmd = cmd + " < " + src;
    } else {
      var tpl_ssh = grunt.template.process(tpls.ssh, {
        data: {
          host: config.ssh_host
        }
      });

      grunt.log.oklns("Importing DUMP into remote database");
      cmd = tpl_ssh + " '" + cmd + "' < " + src;
    }

    return cmd;
  };

  exports.rsync_push_cmd = function(config) {
    var cmd = grunt.template.process(tpls.rsync_push, {
      data: {
        rsync_args: config.rsync_args,
        ssh_host: config.ssh_host,
        from: config.from,
        to: config.to,
        exclusions: config.exclusions
      }
    });

    return cmd;
  };

  exports.rsync_pull_cmd = function(config) {
    var cmd = grunt.template.process(tpls.rsync_pull, {
      data: {
        rsync_args: config.rsync_args,
        ssh_host: config.ssh_host,
        from: config.from,
        to: config.to,
        exclusions: config.exclusions
      }
    });

    return cmd;
  };

  var tpls = {
    backup_path: "<%= backups_dir %>/<%= env %>/<%= date %>/<%= time %>",
    mysqldump: "mysqldump -h <%= host %> -u<%= user %> -p<%= pass %> <%= database %>",
    mysql: "mysql -h <%= host %> -u <%= user %> -p<%= pass %> <%= database %>",
    rsync_push: "rsync <%= rsync_args %> --delete -e 'ssh <%= ssh_host %>' <%= exclusions %> <%= from %> :<%= to %>",
    rsync_pull: "rsync <%= rsync_args %> -e 'ssh <%= ssh_host %>' <%= exclusions %> :<%= from %> <%= to %>",
    ssh: "ssh <%= host %>",
  };

  return exports;
};
