# Grunt Wordpress Deployments

Deploy a Wordpress instance without pain using Grunt.

This plugin leverages on Grunt to push and pull a Wordpress instance into the predefined locations.
Here's a tour of the features:

* Multiple environments support: you can define different environments such as `development`, `staging`, `production` and so on, with different access credentials, paths and domains.
* Adapt the Wordpress database to the destination domain: It replaces all the instances of the source environment domain with the destination environment domain, even into serialized data.
* Push and pull files with rsync.
* Completely based on Javascript, leverages only on some common system tools to perform the tasks (`mysql`, `mysqldump`, `ssh`).

## Requirements

This plugin requires:

* Grunt `~0.4.1`
* `ssh`
* `rsync`
* `mysqldump`

To be able to use this plugin it's important to have access to the remote machine through `ssh`, with ssh key authentication to avoid password entering during the tasks. As this is a different topic we will not cover it here but you might like to start by reading [Github's own advice](https://help.github.com/articles/generating-ssh-keys).

## Getting started

This is a [Grunt](http://gruntjs.com/) plugin, so it requires Grunt. It's really easy to install, as explained into the [Getting Started](http://gruntjs.com/getting-started) guide. Please read the guide to understand how does this works.

When Grunt is installed on your machine, you can install this plugin with the following command:

```shell
npm install grunt-wordpress-deploy --save-dev
```

Once the plugin has been installed, it may be enabled and configured into your Gruntfile.js. Please follow the example Gruntfile to configure your environments.

```js
module.exports = function(grunt) {
  "use strict";

  grunt.initConfig({
    wordpressdeploy: {
      options: {
        backup_dir: "backups/",
        rsync_args: ['--verbose', '--progress', '-rlpt', '--compress', '--omit-dir-times', '--delete'],
        exclusions: ['Gruntfile.js', '.git/', 'tmp/*', 'backups/', 'wp-config.php', 'composer.json', 'composer.lock', 'README.md', '.gitignore', 'package.json', 'node_modules']
      },
      local: {
        "title": "local",
        "database": "database_name",
        "user": "database_username",
        "pass": "database_password",
        "host": "database_host",
        "url": "http://local_url",
        "path": "/local_path"
      },
      staging: {
        "title": "staging",
        "database": "database_name",
        "user": "database_username",
        "pass": "database_password",
        "host": "database_host",
        "url": "http://staging_url",
        "path": "/staging_path",
        "ssh_host": "user@staging_host"
      },
      your_environment: {
        ...
      }
    },
  });

  // Load tasks
  grunt.loadNpmTasks('grunt-wordpress-deploy');

  // Register tasks
  grunt.registerTask('default', [
    'wordpressdeploy'
  ]);
};
```

In the example above we define two environments, one is mandatory and is always called `local`, another is optional and can be called the way you want. In this case we have defined a second environment called `staging`.

## Available tasks

The plugin defines a serie of tasks. Here's a brief overview:

* `grunt push_db --target=environment_name`: Push the local database to the specified environment.
* `grunt pull_db --target=environment_name`: Pull the database on the specified environment into the local environment.
* `grunt push_files --target=environment_name`: Push the local files to the specified environment, using rsync.
* `grunt pull_files --target=environment_name`: Pull the files from the specified environment to the local environment, using rsync.

### Push_db

Example execution: `grunt push_db --target=staging`

The `push_db` command moves your local database to a remote database location, specified by the target environment. What happens under the hood is the following:

- Dump the local database
- Adapt the local dump to the remote environment executing a search and replace to change the instances of the local domain with the instances of the remote domain, taking care of serialized data
- Backups the database on the target environment
- Imports the local adapted dump into the remote database


### Pull_db

Example execution: `grunt pull_db --target=staging`

The `pull_db` command moves your target environment database to the local database. What happens under the hood is the following:

- Dump the remote database
- Adapt the remote dump to the local environment executing a search and replace to change the instances of the remote domain with the instances of the local domain, taking care of serialized data
- Backups the database on the local environment
- Imports the remote adapted dump into the local database

### Push_files

Example execution: `grunt push_files --target=staging`

The `push_files` command moves your local environment files to the target environment using rsync.

This operation is not reversible.

Into `Gruntfile.js` is possible to set which options rsync will use, and which files should be exluded from the synchronization.
More details in the configuration section below.

```js
  grunt.initConfig({
    wordpressdeploy: {
      options: {
        backup_dir: "backups/",
        rsync_args: ['--verbose', '--progress', '-rlpt', '--compress', '--omit-dir-times', '--delete'],
        exclusions: ['Gruntfile.js', '.git/', 'tmp/*', 'backups/', 'wp-config.php', 'composer.json', 'composer.lock', 'README.md', '.gitignore', 'package.json', 'node_modules']
      },
      local: {
        ...
```

### Pull_files

Example execution: `grunt pull_files --target=staging`

The `pull_files` command moves your target environment files to the local environment using rsync.

This operation is not reversible.

Into `Gruntfile.js` is possible to set which options rsync will use, and which files should be exluded from the synchronization.


### Configuration

Each target expects a series of configuration options to be provided to enable the task to function correctly. These are detailed below:

#### title
Type: `String`

Description: A proper case name for the target. Used to describe the target to humans in console output whilst the task is running.

#### database
Type: `String`

Description: the name of the database for this target.

#### user
Type: `String`

Description: the database user with permissions to access and modify the database

#### pass
Type: `String`

Description: the password for the database user (above)

#### host
Type: `String`

Description: the hostname for the location in which the database resides.

#### url
Type: `String`

Description: the string to search and replace within the database before it is moved to the target location. This is designed for use with the awful Wordpress implementation which stores  [the site url into the database](http://codex.wordpress.org/Changing_The_Site_URL) and is required to be updated upon migration to a new environment.

#### path
Type: `String`

Description: the path of the the installation files on the filesystem. Used by rsync to update the correct folder on synchronization.

#### ssh_host
Type: `String`

Description: ssh connection string in the format `SSH_USER@SSH_HOST`. The task assumes you have ssh keys setup which allow you to remote into your server without requiring the input of a password.

### Options

#### options.backups_dir
Type: `String`

Default value: `backups`

A string value that represents the directory path (*relative* to your Grunt file) to which you want your database backups for source and target to be saved prior to modifications.

You may wish to have your backups reside outside the current working directory of your Gruntfile. In which case simply provide the relative path eg: ````../../backups````.

#### options.rsync_args
Type: `Array`

Default value: `['--verbose', '--progress', '-rlpt', '--compress', '--omit-dir-times', '--delete']`

An array representing all parameters passed to the rsync command in order to perform the synchronization operation. The defult value in this example is fine for common usages of this plugin.


#### options.exclusions
Type: `Array`

Default value: `['Gruntfile.js', '.git/', 'tmp/*', 'backups/', 'wp-config.php', 'composer.json', 'composer.lock', 'README.md', '.gitignore', 'package.json', 'node_modules']`

An array representing all excluded files and directories from the synchronization process.

## History

This plugin is an almost complete rewrite of the [Grunt-Deployments Plugin](https://github.com/getdave/grunt-deployments).
Credits to the original developer for the work on the original plugin.
