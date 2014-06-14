'use strict';
var grunt = require('grunt');
var util = require('../tasks/lib/util.js').init(grunt);

module.exports = {
  replace_urls: function(test) {
    test.expect(3);

    var search = 'http://loremipsum';
    var replace = 'http://www.loremipsum.com';

    var string1 = '';
    test.equal(
      util.replace_urls(search, replace, string1),
      '',
      "Replacing a blank line will return the blank line."
    );

    var string2 = '{s:19:"payment_success_url";s:37:"http://loremipsum/payment-successful/";}http://loremipsum/hb';
    test.equal(
      util.replace_urls(search, replace, string2),
      '{s:19:"payment_success_url";s:45:"http://www.loremipsum.com/payment-successful/";}http://www.loremipsum.com/hb',
      "Replacing a mixed string, serialized or not."
    );

    search = 'http://loremipsum';
    replace = 'http://loremipsum.loremipsum.com';

    var string3 = '{s:19:"payment_success_url";s:37:"http://loremipsum/payment-successful/";}http://loremipsum.loremipsum.com/hb';
    test.equal(
      util.replace_urls(search, replace, string3),
      '{s:19:"payment_success_url";s:52:"http://loremipsum.loremipsum.com/payment-successful/";}http://loremipsum.loremipsum.com/hb',
      "Replacing a mixed string, serialized or not, with the source url contained into the replace url."
    );

    test.done();
  },

  replace_urls_in_serialized: function(test) {
    test.expect(4);

    var search = 'http://loremipsum';
    var replace = 'http://www.loremipsum.com';

    var string1 = '{s:19:"payment_success_url";s:37:"http---loremaaaam/payment-successful/";}';
    test.equal(
      util.replace_urls_in_serialized(search, replace, string1),
      '{s:19:"payment_success_url";s:37:"http---loremaaaam/payment-successful/";}',
      "Don't replace as this serialized data has no url inside."
    );

    var string2 = '{s:19:"payment_success_url";s:37:"http://loremipsum/payment-successful/";}';
    test.equal(
      util.replace_urls_in_serialized(search, replace, string2),
      '{s:19:"payment_success_url";s:45:"http://www.loremipsum.com/payment-successful/";}',
      "Replace a single url into serialized data."
    );

    var string3 = '{s:19:"payment_success_url";s:37:"http://loremipsum/payment-successful/";s:16:"payment_fail_url";s:33:"http://loremipsum/payment-failed/";s:13:"currency_unit"}';
    test.equal(
      util.replace_urls_in_serialized(search, replace, string3),
      '{s:19:"payment_success_url";s:45:"http://www.loremipsum.com/payment-successful/";s:16:"payment_fail_url";s:41:"http://www.loremipsum.com/payment-failed/";s:13:"currency_unit"}',
      "Replace multiple urls into serialized data."
    );

    var string4 = '{s:19:"payment_success_url";s:74:"http://loremipsum/payment-successful/ and http://loremipsum/error-message/";s:16:"payment_fail_url";s:33:"http://loremipsum/payment-failed/";s:13:"currency_unit"}';
    test.equal(
      util.replace_urls_in_serialized(search, replace, string4),
      '{s:19:"payment_success_url";s:90:"http://www.loremipsum.com/payment-successful/ and http://www.loremipsum.com/error-message/";s:16:"payment_fail_url";s:41:"http://www.loremipsum.com/payment-failed/";s:13:"currency_unit"}',
      "Replace multiple urls in a single serialized object into serialized data."
    );

    test.done();
  },

  replace_urls_in_string: function(test) {
    test.expect(3);

    var search = 'http://loremipsum';
    var replace = 'http://www.loremipsum.com';

    var string1 = 'loremiremipsum';
    test.equal(
      util.replace_urls_in_string(search, replace, string1),
      'loremiremipsum',
      "No url found so no replace."
    );

    var string2 = 'http://loremipsum';
    test.equal(
      util.replace_urls_in_string(search, replace, string2),
      'http://www.loremipsum.com',
      "Replace an url into a string."
    );

    var string3 = 'dfvdsfsdhttp://loremipsumdbshf jshdbfghahttp://loremipsum/bhs/sdf';
    test.equal(
      util.replace_urls_in_string(search, replace, string3),
      'dfvdsfsdhttp://www.loremipsum.comdbshf jshdbfghahttp://www.loremipsum.com/bhs/sdf',
      "Replace multiple urls into a complex string."
    );

    test.done();
  },

  mysqldump_cmd: function(test) {
    test.expect(2);

    var config = {
      user: 'john',
      pass: 'pass',
      database: 'test',
      host: 'localhost'
    };

    var cmd1 = util.mysqldump_cmd(config);
    test.equal(cmd1, "mysqldump -h localhost -ujohn -ppass test", 'Local mysqldump command.');

    config.ssh_host = '127.0.0.1';

    var cmd2 = util.mysqldump_cmd(config);
    test.equal(cmd2, "ssh 127.0.0.1 'mysqldump -h localhost -ujohn -ppass test'", 'SSH remote mysqldump command.');
    test.done();
  },

  mysql_cmd: function(test) {
    test.expect(2);

    var config = {
      host: 'localhost',
      user: 'john',
      pass: 'pass',
      database: 'test',
    };

    var src = '/aaa/bbb';

    var cmd1 = util.mysql_cmd(config, src);
    test.equal(cmd1, "mysql -h localhost -u john -ppass test < /aaa/bbb", 'Local Mysql import command.');

    config.ssh_host = '127.0.0.1';

    var cmd2 = util.mysql_cmd(config, src);
    test.equal(cmd2, "ssh 127.0.0.1 'mysql -h localhost -u john -ppass test' < /aaa/bbb", 'Remote Mysql import command.');
    test.done();
  },

  rsync_push_cmd: function(test) {
    test.expect(1);

    var config = {
      ssh_host: '127.0.0.1',
      from: '/htdocs/test',
      to: '/var/www/test',
      rsync_args: '--verbose --progress',
      exclusions: "--exclude '.git/' --exclude 'composer.json'"
    };

    var cmd1 = util.rsync_push_cmd(config);
    test.equal(cmd1, "rsync --verbose --progress --delete -e 'ssh 127.0.0.1' --exclude '.git/' --exclude 'composer.json' /htdocs/test :/var/www/test", 'Push files to remote host with rsync.');

    test.done();
  },

  rsync_pull_cmd: function(test) {
    test.expect(1);

    var config = {
      ssh_host: '127.0.0.1',
      from: '/var/www/test',
      to: '/htdocs/test',
      rsync_args: '--verbose --progress',
      exclusions: "--exclude '.git/' --exclude 'composer.json'"
    };

    var cmd1 = util.rsync_pull_cmd(config);
    test.equal(cmd1, "rsync --verbose --progress -e 'ssh 127.0.0.1' --exclude '.git/' --exclude 'composer.json' :/var/www/test /htdocs/test", 'Pull files from remote host with rsync.');

    test.done();
  },

  generate_backup_paths: function(test) {
    test.expect(1);

    var target = 'production';
    var task_options = {
      backups_dir: 'backups_dir'
    };
    var today = grunt.template.today('yyyymmdd');
    var now = grunt.template.today('HH-MM-ss');

    var actual = util.generate_backup_paths(target, task_options);

    var expected = {
      dir: 'backups_dir/production/' + today + '/' + now,
      file: 'backups_dir/production/' + today + '/' + now + '/db_backup.sql'
    };

    test.deepEqual(actual, expected, 'Generate backup paths');

    test.done();
  },

  compose_rsync_options: function(test) {
    test.expect(1);

    var options = ['--verbose', '--progress'];
    var string1 = util.compose_rsync_options(options);

    test.equal(string1, '--verbose --progress', "Compose a valid option string from array.");

    test.done();
  },

  compose_rsync_exclusions: function(test) {
    test.expect(1);

    var exclusions = ['.git/', 'composer.json'];
    var string1 = util.compose_rsync_exclusions(exclusions);

    test.equal(string1, "--exclude '.git/' --exclude 'composer.json'", "Compose a the exclusions string from array.");

    test.done();
  }
};
