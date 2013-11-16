'use strict';

exports.init = function (grunt) {
  var shell = require('shelljs');

  var exports = {};

  exports.db_replace = function(search, replace, output_file) {
    grunt.log.writeln("Replacing '" + search + "' with '" + replace + "' in the database.");
    shell.exec(exports.replace_cmd(search, replace, output_file));
    grunt.log.oklns("Database references succesfully updated.");
  };

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

  /* Commands generators */
  exports.replace_cmd = function(search, replace, output_file) {
    var cmd = grunt.template.process(tpls.search_replace, {
      data: {
        search: search,
        replace: replace,
        path: output_file
      }
    });
    return cmd;
  };

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
      grunt.log.writeln("Creating DUMP of local database");
    } else {
      grunt.log.writeln("Creating DUMP of remote database");
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
      grunt.log.writeln("Importing DUMP into local database");
      cmd = cmd + " < " + src;
    } else {
      var tpl_ssh = grunt.template.process(tpls.ssh, {
        data: {
          host: config.ssh_host
        }
      });

      grunt.log.writeln("Importing DUMP into remote database");
      cmd = tpl_ssh + " '" + cmd + "' < " + src;
    }

    return cmd;
  };

  var tpls = {
    backup_path: "<%= backups_dir %>/<%= env %>/<%= date %>/<%= time %>",
    search_replace: "sed -i '' 's#<%= search %>#<%= replace %>#g' <%= path %>",
    mysqldump: "mysqldump -h <%= host %> -u<%= user %> -p<%= pass %> <%= database %>",
    mysql: "mysql -h <%= host %> -u <%= user %> -p<%= pass %> <%= database %>",
    ssh: "ssh <%= host %>",
  };

  return exports;
};
