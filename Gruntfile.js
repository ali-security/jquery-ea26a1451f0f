module.exports = function( grunt ) {
	"use strict";

	function readOptionalJSON( filepath ) {
		var data = {};
		try {
			data = grunt.file.readJSON( filepath );
		} catch ( e ) {}
		return data;
	}

	var gzip = require( "gzip-js" ),
		srcHintOptions = readOptionalJSON( "src/.jshintrc" );

	// The concatenated file won't pass onevar
	// But our modules can
	delete srcHintOptions.onevar;

	grunt.initConfig({
		pkg: grunt.file.readJSON( "package.json" ),
		dst: readOptionalJSON( "dist/.destination.json" ),
		compare_size: {
			files: [ "dist/jquery.js", "dist/jquery.min.js" ],
			options: {
				compress: {
					gz: function( contents ) {
						return gzip.zip( contents, {} ).length;
					}
				},
				cache: "build/.sizecache.json"
			}
		},
		build: {
			all: {
				dest: "dist/jquery.js",
				minimum: [
					"core",
					"selector"
				],
				removeWith: {
					ajax: [ "manipulation/_evalUrl" ],
					callbacks: [ "deferred" ],
					css: [ "effects", "dimensions", "offset" ]
				}
			}
		},
		bowercopy: {
			options: {
				clean: true
			},
			src: {
				files: {
					"src/sizzle/dist": "sizzle/dist",
					"src/sizzle/test/data": "sizzle/test/data",
					"src/sizzle/test/unit": "sizzle/test/unit",
					"src/sizzle/test/index.html": "sizzle/test/index.html",
					"src/sizzle/test/jquery.js": "sizzle/test/jquery.js"
				}
			},
			tests: {
				options: {
					destPrefix: "test/libs"
				},
				files: {
					"qunit": "qunit/qunit",
					"require.js": "requirejs/require.js",
					"sinon/fake_timers.js": "sinon/lib/sinon/util/fake_timers.js",
					"sinon/timers_ie.js": "sinon/lib/sinon/util/timers_ie.js"
				}
			}
		},
		jsonlint: {
			pkg: {
				src: [ "package.json" ]
			},

			bower: {
				src: [ "bower.json" ]
			}
		},
		jshint: {
			all: {
				src: [
					"src/**/*.js", "Gruntfile.js", "test/**/*.js", "build/tasks/*",
					"build/{bower-install,release-notes,release}.js"
				],
				options: {
					jshintrc: true
				}
			},
			dist: {
				src: "dist/jquery.js",
				options: srcHintOptions
			}
		},
		jscs: {
			src: "src/**/*.js",
			gruntfile: "Gruntfile.js",

			// Right know, check only test helpers
			test: [ "test/data/testrunner.js", "test/data/testinit.js" ],
			tasks: "build/tasks/*.js"
		},
		testswarm: {
			tests: "ajax attributes callbacks core css data deferred dimensions effects event manipulation offset queue selector serialize support traversing".split( " " )
		},
		watch: {
			files: [ "<%= jshint.all.src %>" ],
			tasks: "dev"
		},
		uglify: {
			all: {
				files: {
					"dist/jquery.min.js": [ "dist/jquery.js" ]
				},
				options: {
					preserveComments: false,
					sourceMap: "dist/jquery.min.map",
					sourceMappingURL: "jquery.min.map",
					report: "min",
					beautify: {
						ascii_only: true
					},
					banner: "/*! jQuery v<%= pkg.version %> | " +
						"(c) 2005, 2014 jQuery Foundation, Inc. | " +
						"jquery.org/license */",
					compress: {
						hoist_funs: false,
						loops: false,
						unused: false
					}
				}
			}
		}
	});

	// Load grunt tasks from NPM packages
	require( "load-grunt-tasks" )( grunt );

	// Integrate jQuery specific tasks
	grunt.loadTasks( "build/tasks" );

	// The release's dist/jquery.js embeds the build timestamp. Pin it from the
	// environment so a rebuild reproduces the published file byte-for-byte.
	grunt.registerTask( "stampdate", function() {
		var file = "dist/jquery.js",
			date = process.env.SOURCE_DATE;

		if ( date ) {
			grunt.file.write( file,
				grunt.file.read( file ).replace( /^ \* Date: .*$/m, " * Date: " + date ) );
			grunt.log.writeln( "Date stamped as " + date + "." );
		}
	});

	// The published release ships dist/cdn copies of the built files, produced by
	// the jquery-release tool that lives outside this repo. Recreate them here so
	// a source build carries the same set.
	grunt.registerTask( "cdn", function() {
		var version = grunt.config( "pkg.version" ),
			src = grunt.file.read( "dist/jquery.js" ),
			map = grunt.file.read( "dist/jquery.min.map" ),

			// CDN copies carry no sourceMappingURL comment
			min = grunt.file.read( "dist/jquery.min.js" )
				.replace( /\/\/# sourceMappingURL=jquery\.min\.map$/, "" );

		[ "jquery", "jquery-" + version, "jquery-latest" ].forEach(function( name ) {
			grunt.file.write( "dist/cdn/" + name + ".js", src );
			grunt.file.write( "dist/cdn/" + name + ".min.js", min );
			grunt.file.write( "dist/cdn/" + name + ".min.map",
				map.replace( /jquery\.min\.js/g, name + ".min.js" )
					.replace( /"jquery\.js"/g, "\"" + name + ".js\"" ) );
			grunt.log.writeln( "File 'dist/cdn/" + name + ".min.js' created." );
		});
	});

	grunt.registerTask( "bower", "bowercopy" );
	grunt.registerTask( "lint", [ "jshint", "jscs" ] );

	// Short list as a high frequency watch task
	grunt.registerTask( "dev", [ "build:*:*", "lint" ] );

	// Default grunt
	grunt.registerTask( "default", [ "jsonlint", "dev", "uglify", "dist:*", "compare_size" ] );
};
