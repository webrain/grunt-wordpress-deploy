'use strict';
var grunt = require('grunt');

/*
  ======== A Handy Little Nodeunit Reference ========
  https://github.com/caolan/nodeunit

  Test methods:
    test.expect(numAssertions)
    test.done()
  Test assertions:
    test.ok(value, [message])
    test.equal(actual, expected, [message])
    test.notEqual(actual, expected, [message])
    test.deepEqual(actual, expected, [message])
    test.notDeepEqual(actual, expected, [message])
    test.strictEqual(actual, expected, [message])
    test.notStrictEqual(actual, expected, [message])
    test.throws(block, [error], [message])
    test.doesNotThrow(block, [error], [message])
    test.ifError(value)
*/

var util = require('../tasks/lib/util.js').init(grunt);

module.exports = {
  replace_cmd: function(test) {
    test.expect(3);

    var cmd1 = util.replace_cmd('http://example.com', 'http://ex2.com', '/tmp');
    test.equal(cmd1, "sed -i '' 's#http://example.com#http://ex2.com#g' /tmp", 'Create sed with common urls');

    var cmd2 = util.replace_cmd('http://example.com', 'ex2.com', '/tmp');
    test.equal(cmd2, "sed -i '' 's#http://example.com#ex2.com#g' /tmp", 'Create sed with urls without http');

    var cmd3 = util.replace_cmd('example.com/', 'http://ex2.com', '/tmp/');
    test.equal(cmd3, "sed -i '' 's#example.com/#http://ex2.com#g' /tmp/", 'Create sed with trailing slashes');

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
  }
};
