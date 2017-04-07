module.exports = function(grunt) {
    require('load-grunt-tasks')(grunt);

    var traceurRuntimePath = "./node_modules/grunt-traceur-compiler/"
    var srcDir = "src/", destDir = "dist/", buildDir = "build/"
    var DEV = "dev"

    grunt.task.registerTask("initialize", "init", function() {
        grunt.file.delete(buildDir, {force: true});
        grunt.file.copy("error.html", destDir + "/index.html"); 
        grunt.file.mkdir("build")
    })
 
    grunt.initConfig({
        "target": "dist",
        "bower": {
            "copy": {
                options: {
                    targetDir: './dist/libs',
                    layout: 'byComponent',
                    install: true,
                    verbose: false,
                    cleanTargetDir: false,
                    cleanBowerDir: false,
                    bowerOptions: {}
                }                
            }
        },
        less: {
            dev: {
                options: {
                    sourceMap: true,
                    sourceMapRootpath: "../../",
                    sourceMapFileInline: true 
                },
                files: {
                    './<%=target%>/css/style.css': ['./assets/less/*.less']
                }
            },
        },
        "traceur": {
            options: {
                experimental: true,
                "source-maps": 'inline'
            },
            dev: {
                files: [
                    { expand: true, cwd: ".", src: srcDir + "/**/*.js", dest: buildDir },
                ]
            }
        },

        "babel": {
            options: {
                presets: ["stage-3", "es2015"]
            },
            dev: {
                files: [
                    { expand: true, cwd: "./src/", src: "**/*.js", dest: buildDir + srcDir},
                    { expand: true, cwd: "./src/", src: "**/*.js", dest: "testbuild" },
                ]
            }
        },

        "copy": {
            dev: {
                files: [
                    { expand: true, cwd: "./assets/vendors", src: "**/*.*", dest: "./<%=target%>/libs/"},
                    { expand: true, cwd: "./assets/scripts", src: "**/*.*", dest: "./<%=target%>/scripts/"},
                    { expand: true, cwd: "./assets/css", src: "**/*.*", dest: "./<%=target%>/css/"},
                    { expand: true, cwd: "./assets/config", src: "**/*.*", dest: "./<%=target%>/config/"},
                    { src: "bower.json", dest: "./<%=target%>/bower.json" },
                    { src: "package.json", dest: "./<%=target%>/package.json" }                    
                ]
            }
        },

        "watch": {
            options: {
                spawn: false
            },
            dev: {
                files: [srcDir + '/**/*.js', "assets/scripts/**/*.js", "assets/less/**/*.less", "assets/css/**/*.css", "assets/config/**/*.*", "templates/**/*.*"],
                tasks: [DEV]
            },
        },
        "shell": {
            traceur: {
                command: "traceur --experimental --source-maps  --modules=instantiate --dir src/ " + destDir + "/src/"
            },
            compile: {
                command: 'node src/make.js'
            }
        },
    });

    grunt.task.registerTask("clean", "clean", function() {
        grunt.file.delete(buildDir, {force: true});
    })

    grunt.loadNpmTasks('grunt-shell');
    grunt.loadNpmTasks('grunt-bower-task');
    grunt.loadNpmTasks('grunt-traceur');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-babel');

    grunt.registerTask("init", ["initialize", "bower:copy"]);

    // grunt.registerTask("dev-simple", ["traceur:" + DEV, "less:" + DEV, "copy:" + DEV]);
    grunt.registerTask("dev-simple", ["shell:traceur", "less:" + DEV, "copy:" + DEV]);
    grunt.registerTask(DEV, ["initialize", "shell:traceur", "less:" + DEV, "shell:compile", "copy:" + DEV,  "clean"]);
    // grunt.registerTask(DEV, ["initialize", "shell:traceur", "less:" + DEV, "copy:" + DEV,  "clean"]);
    // grunt.registerTask(DEV, ["initialize", "traceur:" + DEV, "less:" + DEV, "shell:compile", "copy:" + DEV,  "clean"]);
    // grunt.registerTask(DEV, ["initialize", "babel:" + DEV, "less:" + DEV, "shell:compile", "copy:" + DEV,  "clean"]);

}