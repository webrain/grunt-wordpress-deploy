/*
 * grunt-wordpress-deploy
 * https://github.com/webrain/grunt-wordpress-deploy
 *
 * Copyright (c) 2013 Webrain
 * Licensed under the MIT license.
 */

'use strict';

var grunt = require('grunt');
var util = require('../tasks/lib/util.js').init(grunt);

module.exports = function(grunt) {

  /**
   * DB PUSH
   * pushes local database to remote database
   */
  grunt.registerTask('db_push', 'Push to Database', function() {

    var task_options    = grunt.config.get('wordpressdeploy')['options'];

    var target = grunt.option('target') || task_options['target'];

    if ( typeof target === "undefined" || typeof grunt.config.get('wordpressdeploy')[target] === "undefined")  {
      grunt.fail.warn("Invalid target specified. Did you pass the wrong argument? Please check your task configuration.", 6);
    }

    // Grab the options
    var target_options      = grunt.config.get('wordpressdeploy')[target];
    var local_options       = grunt.config.get('wordpressdeploy').local;

    // Generate required backup directories and paths
    var local_backup_paths  = util.generate_backup_paths("local", task_options);
    var target_backup_paths = util.generate_backup_paths(target, task_options);

    grunt.log.subhead("Pushing database from 'Local' to '" + target_options.title + "'");

    // Dump local DB
    util.db_dump(local_options, local_backup_paths);

    // Search and Replace database refs
    util.db_replace(local_options.url, target_options.url, local_backup_paths.file);

    // Dump target DB
    util.db_dump(target_options, target_backup_paths);

    // Import dump to target DB
    util.db_import(target_options, local_backup_paths.file);

    grunt.log.subhead("Operations completed");
  });

  /**
   * DB PULL
   * pulls remote database into local database
   */
  grunt.registerTask('db_pull', 'Pull from Database', function() {

    var task_options = grunt.config.get('wordpressdeploy')['options'];
    var target       = grunt.option('target') || task_options['target'];

    if ( typeof target === "undefined" || typeof grunt.config.get('wordpressdeploy')[target] === "undefined")  {
      grunt.fail.warn("Invalid target provided. I cannot pull a database from nowhere! Please checked your configuration and provide a valid target.", 6);
    }

    // Grab the options
    var target_options      = grunt.config.get('wordpressdeploy')[target];
    var local_options       = grunt.config.get('wordpressdeploy').local;

    // Generate required backup directories and paths
    var local_backup_paths  = util.generate_backup_paths("local", task_options);
    var target_backup_paths = util.generate_backup_paths(target, task_options);

    // Start execution
    grunt.log.subhead("Pulling database from '" + target_options.title + "' into Local");

    // Dump Target DB
    util.db_dump(target_options, target_backup_paths );

    util.db_replace(target_options.url,local_options.url,target_backup_paths.file);

    // Backup Local DB
    util.db_dump(local_options, local_backup_paths);

    // Import dump into Local
    util.db_import(local_options,target_backup_paths.file);

    grunt.log.subhead("Operations completed");
  });
};
