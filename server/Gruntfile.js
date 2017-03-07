var Path = require("path")

module.exports = function(grunt) {
    require('load-grunt-tasks')(grunt);
    var traceurRuntimePath = "./node_modules/grunt-traceur-compiler/"

    grunt.initConfig({
        target: "target",
        bower: {
            options: {
                layout: 'byComponent',
                install: true,
                verbose: false,
                cleanTargetDir: false,
                cleanBowerDir: false,
                bowerOptions: {}                
            },
            "copy": {
                options: {
                    targetDir: "./<%=target%>/public/libraries/",
                }
            },
        },       
        shell: {
            "compile": {
                command: "node app.js"
            },
        },
        copy: {
            "copy_resource": {
                files: [
                    { expand: true, cwd: "./assets/", src: "**/*", dest: "./<%=target%>/assets/" },
                    { expand: true, cwd: "./public/", src: "**/*", dest: "./<%=target%>/public/" },
                    { expand: true, cwd: "./views/", src: "**/*", dest: "./<%=target%>/views/" },
                    { expand: true, cwd: "./externals/", src: "**/*", dest: "./<%=target%>/externals/" },
                    { src: "bower.json", dest: "./<%=target%>/bower.json" },
                    { src: "package.json", dest: "./<%=target%>/package.json" }
                ]
            },
            "copy_code": {
                files: [
                    { expand: false, cwd: "./", src: "*.js", dest: "./<%=target%>/" }
                ]
            }

        },
        watch: {
            options: {
                spawn: false
            },            
            "source": {
                files: ['routes/**/*.js', 'functions/**/*.js', '*.js', 'src/**/*.js', 'utils/**/*.js', '!node_modules/**', '!bower_components/**', '!temp/**'],
                tasks: ["compile"]
            },  
            "resource": {
                files: ['./views/**/*', './assets/**/*', './public/**/*'],
                tasks: ["copy:copy_resource"]
            },              
        },
        "babel": {
            options: {
                // sourceMap: true,
                presets: ["stage-3", "es2015"]
            },            
            compile: {
                files: [
                    { expand: true, cwd: "./routes/", src: "**/*.js", dest: "./<%=target%>/routes/" },
                    { expand: true, cwd: "./utils/", src: "**/*.js", dest: "./<%=target%>/utils/" },
                    { expand: true, cwd: "./functions/", src: "**/*.js", dest: "./<%=target%>/functions/" },
                    {"./<%=target%>/test.js": "./test.js"},
                ]
            }
        } 
    });

    grunt.event.on('watch', function(action, filepath, target) {
        grunt.log.oklns("watch file changed at " + new Date().toString());
    });

    grunt.loadNpmTasks('grunt-bower-task');
    grunt.loadNpmTasks('grunt-shell');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-traceur-compiler');
    grunt.loadNpmTasks('grunt-babel');

    grunt.registerTask("bowercopy", ["bower:copy"]);
    
    grunt.registerTask("compile", ["copy:copy_code", "babel"]);
    grunt.registerTask("dev", ["bower", "babel", "copy:copy_resource", "copy:copy_code"]);


}