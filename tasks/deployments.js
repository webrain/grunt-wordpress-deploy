/*
 * grunt-deployments
 * https://github.com/getdave/grunt-deployments
 *
 * Copyright (c) 2013 David Smith
 * Licensed under the MIT license.
 */

'use strict';

var shell = require('shelljs');

module.exports = function(grunt) {




    /**
     * DB PUSH
     * pushes local database to remote database
     */
    grunt.registerTask('db_push', 'Push to Database', function() {

        // Options
        var task_options    = grunt.config.get('deployments')['options'];

        // Get the target from the CLI args
        var target = grunt.option('target') || task_options['target'];

        if ( typeof target === "undefined" || typeof grunt.config.get('deployments')[target] === "undefined")  {
            grunt.fail.warn("Invalid target specified. Did you pass the wrong argument? Please check your task configuration.", 6);
        }

        // Grab the options from the shared "deployments" config options
        var target_options      = grunt.config.get('deployments')[target];
        var local_options       = grunt.config.get('deployments').local;

        // Generate required backup directories and paths
        var local_backup_paths  = generate_backup_paths("local", task_options);
        var target_backup_paths = generate_backup_paths(target, task_options);


        grunt.log.subhead("Pushing database from 'Local' to '" + target_options.title + "'");


        // Dump local DB
        db_dump(local_options, local_backup_paths);

        // Search and Replace database refs
        db_replace( local_options.url, target_options.url, local_backup_paths.file );

        // Dump target DB
        db_dump(target_options, target_backup_paths);

        // Import dump to target DB
        db_import(target_options, local_backup_paths.file);

        grunt.log.subhead("Operations completed");
    });


    /**
     * DB PULL
     * pulls remote database into local database
     */
    grunt.registerTask('db_pull', 'Pull from Database', function() {

        // Options
        var task_options    = grunt.config.get('deployments')['options'];

        // Get the target from the CLI args
        var target              = grunt.option('target') || task_options['target'];

        if ( typeof target === "undefined" || typeof grunt.config.get('deployments')[target] === "undefined")  {
            grunt.fail.warn("Invalid target provided. I cannot pull a database from nowhere! Please checked your configuration and provide a valid target.", 6);
        }



        // Grab the options from the shared "deployments" config options
        var target_options      = grunt.config.get('deployments')[target];
        var local_options       = grunt.config.get('deployments').local;

        // Generate required backup directories and paths
        var local_backup_paths  = generate_backup_paths("local", task_options);
        var target_backup_paths = generate_backup_paths(target, task_options);

        // Start execution
        grunt.log.subhead("Pulling database from '" + target_options.title + "' into Local");

        // Dump Target DB
        db_dump(target_options, target_backup_paths );

        db_replace(target_options.url,local_options.url,target_backup_paths.file);

        // Backup Local DB
        db_dump(local_options, local_backup_paths);

        // Import dump into Local
        db_import(local_options,target_backup_paths.file);

        grunt.log.subhead("Operations completed");

    });



    function generate_backup_paths(target, task_options) {

        var rtn = [];

        var backups_dir = task_options['backups_dir'] || "backups";

        // Create suitable backup directory paths
        rtn['dir'] = grunt.template.process(tpls.backup_path, {
            data: {
                backups_dir: backups_dir,
                env: target,
                date: grunt.template.today('yyyymmdd'),
                time: grunt.template.today('HH-MM-ss'),
            }
        });


        rtn['file'] = rtn['dir'] + '/db_backup.sql';

        return rtn;
    }


    /**
     * Imports a .sql file into the DB provided
     */
    function db_import(config, src) {

        var cmd;

        // 1) Create cmd string from Lo-Dash template
        var tpl_mysql = grunt.template.process(tpls.mysql, {
            data: {
                host: config.host,
                user: config.user,
                pass: config.pass,
                database: config.database,
                path: src
            }
        });


        // 2) Test whether target MYSQL DB is local or whether requires remote access via SSH
        if (typeof config.ssh_host === "undefined") { // it's a local connection
            grunt.log.writeln("Importing into local database");
            cmd = tpl_mysql + " < " + src;
        } else { // it's a remote connection
            var tpl_ssh = grunt.template.process(tpls.ssh, {
                data: {
                    host: config.ssh_host
                }
            });

            grunt.log.writeln("Importing DUMP into remote database");

            cmd = tpl_ssh + " '" + tpl_mysql + "' < " + src;
        }

         // Execute cmd
        shell.exec(cmd);

        grunt.log.oklns("Database imported succesfully");
    }



    /**
     * Dumps a MYSQL database to a suitable backup location
     */
    function db_dump(config, output_paths) {

        var cmd;

        grunt.file.mkdir(output_paths.dir);


        // 2) Compile MYSQL cmd via Lo-Dash template string
        var tpl_mysqldump = grunt.template.process(tpls.mysqldump, {
            data: {
                user: config.user,
                pass: config.pass,
                database: config.database,
                host: config.host
            }
        });


        // 3) Test whether MYSQL DB is local or whether requires remote access via SSH
        if (typeof config.ssh_host === "undefined") { // it's a local connection
            grunt.log.writeln("Creating DUMP of local database");
            cmd = tpl_mysqldump;

        } else { // it's a remote connection
            var tpl_ssh = grunt.template.process(tpls.ssh, {
                data: {
                    host: config.ssh_host
                }
            });
            grunt.log.writeln("Creating DUMP of remote database");

            cmd = tpl_ssh + " \\ " + tpl_mysqldump;
        }

        // Capture output...
        var output = shell.exec(cmd, {silent: true}).output;

        // Write output to file using native Grunt methods
        grunt.file.write( output_paths.file, output );

        grunt.log.oklns("Database DUMP succesfully exported to: " + output_paths.file);

    }


    function db_replace(search,replace,output_file) {

        var cmd = grunt.template.process(tpls.search_replace, {
            data: {
                search: search,
                replace: replace,
                path: output_file
            }
        });

        grunt.log.writeln("Replacing '" + search + "' with '" + replace + "' in the database.");
         // Execute cmd
        shell.exec(cmd);
        grunt.log.oklns("Database references succesfully updated.");
    }




     /**
     * Lo-Dash Template Helpers
     * http://lodash.com/docs/#template
     * https://github.com/gruntjs/grunt/wiki/grunt.template
     */
    var tpls = {

        backup_path: "<%= backups_dir %>/<%= env %>/<%= date %>/<%= time %>",

        search_replace: "sed -i '' 's#<%= search %>#<%= replace %>#g' <%= path %>",

        mysqldump: "mysqldump -h <%= host %> -u<%= user %> -p<%= pass %> <%= database %>",

        mysql: "mysql -h <%= host %> -u <%= user %> -p<%= pass %> <%= database %>",

        ssh: "ssh <%= host %>",
    };



};





