/**
 *   ArtiGen
 *   Author : ThemeWrapper
 *   URL :
 **/

/*
  Usage:
  1. npm install //To install all dev dependencies of package
  2. npm run dev //To start development and server for live preview
  3. npm run prod //To generate minifed files for live server
*/

const { src, dest, watch, series, parallel } = require("gulp");
const fileInclude = require("gulp-file-include");
const prettyHtml = require("gulp-pretty-html");
const sass = require("gulp-sass")(require("sass"));
const postcss = require("gulp-postcss");
const tailwindcss = require("tailwindcss");
const autoprefixer = require("autoprefixer");
const purgecss = require("gulp-purgecss");
const cssnano = require("cssnano");
const uglify = require("gulp-uglify");
const imagemin = require("gulp-imagemin");
const del = require("del");
const browsersync = require("browser-sync").create();

const srcPathName = "src";
const buildPathName = "build";
const distPathName = "dist";

const paths = {
	html: {
		src: `./${srcPathName}/**/*.html`,
		partials: `./${srcPathName}/partials/**/*.html`,
		dest: `./${buildPathName}`,
		destProd: `./${distPathName}`,
	},
	css: {
		src: `./${srcPathName}/css/**/*.{scss,css}`,
		externals: `./${srcPathName}/css/externals/**/*.css`,
		dest: `./${buildPathName}/assets/css`,
		destProd: `./${distPathName}/assets/css`,
	},
	js: {
		src: `./${srcPathName}/js/**/*.js`,
		externals: `./${srcPathName}/js/externals/**/*.js`,
		dest: `./${buildPathName}/assets/js`,
		destProd: `./${distPathName}/assets/js`,
	},

	img: {
		src: `./${srcPathName}/img/**/*.{jpg,jpeg,png,svg}`,
		dest: `./${buildPathName}/assets/img`,
		destProd: `./${distPathName}/assets/img`,
	},
	fonts: {
		src: `./${srcPathName}/fonts/**/*.{eot,ttf,svg,woff,woff2}`,
		dest: `./${buildPathName}/assets/fonts`,
		destProd: `./${distPathName}/assets/fonts`,
	},
	php: {
		src: `./${srcPathName}/php/**/*.php`,
		dest: `./${buildPathName}/assets/php`,
		destProd: `./${distPathName}/assets/php`,
	},
	// json: {
	// 	src: `./${srcPathName}/json/**/*.json`,
	// 	dest: `./${buildPathName}/assets/json`,
	// 	destProd: `./${distPathName}/assets/json`,
	// },
	clean: {
		dist: `./${distPathName}/*`,
		all: `./${buildPathName}/*`,
		html: `./${buildPathName}/*.html`,
		css: `./${buildPathName}/assets/css/*`,
		js: `./${buildPathName}/assets/js/*`,
		img: `./${buildPathName}/assets/img/*`,
		fonts: `./${buildPathName}/assets/fonts/*`,
		php: `./${buildPathName}/assets/php/*`,
		// json: `./${buildPathName}/assets/json/*`,
	},
};

// Browsersync Tasks
function browsersyncServe(done) {
	browsersync.init({
		server: {
			baseDir: `./${buildPathName}`,
		},
		notify: false,
	});
	done();
}

// Browsersync reload
function browsersyncReload(done) {
	browsersync.reload();
	done();
}

// HTML Task
function htmlTask() {
	return src([paths.html.src, `!${paths.html.partials}`])
		.pipe(fileInclude({ prefix: "@@", basepath: "@file" }))
		.pipe(prettyHtml())
		.pipe(dest(paths.html.dest));
}

// HTML production task
function htmlTaskProd() {
	return src([paths.html.src, `!${paths.html.partials}`])
		.pipe(fileInclude({ prefix: "@@", basepath: "@file" }))
		.pipe(prettyHtml())
		.pipe(dest(paths.html.destProd));
}

// CSS Task
function cssTask() {
	return src([paths.css.src, `!${paths.css.externals}`], { sourcemaps: true })
		.pipe(sass())
		.on("error", sass.logError)
		.pipe(postcss([tailwindcss("./tailwind.config.js"), autoprefixer()]))
		.pipe(dest(paths.css.dest, { sourcemaps: "." }))
		.pipe(src(paths.css.externals))
		.pipe(dest(paths.css.dest));
}

// CSS Task Production
function cssTaskProd() {
	return src([paths.css.src, `!${paths.css.externals}`], { sourcemaps: false })
		.pipe(sass())
		.on("error", sass.logError)
		.pipe(postcss([tailwindcss("./tailwind.config.js"), autoprefixer(), cssnano()]))
		.pipe(dest(paths.css.destProd))
		.pipe(src(paths.css.externals))
		.pipe(dest(paths.css.destProd));
}

// JavaScript Task
function jsTask() {
	return src([paths.js.src, `!${paths.js.externals}`])
		.pipe(dest(paths.js.dest))
		.pipe(src(paths.js.externals))
		.pipe(dest(paths.js.dest));
}

// JavaScript Task Production
function jsTaskProd() {
	return src([paths.js.src, `!${paths.js.externals}`])
		.pipe(uglify())
		.pipe(dest(paths.js.destProd))
		.pipe(src(paths.js.externals))
		.pipe(dest(paths.js.destProd));
}

// Image Task
function imgTask() {
	return src(paths.img.src).pipe(imagemin()).pipe(dest(paths.img.dest));
}

// Image Task Production
function imgTaskProd() {
	return src(paths.img.src).pipe(imagemin()).pipe(dest(paths.img.destProd));
}

// Fonts Task
function fontsTask() {
	return src(paths.fonts.src).pipe(dest(paths.fonts.dest));
}

// Fonts Task Production
function fontsTaskProd() {
	return src(paths.fonts.src).pipe(dest(paths.fonts.destProd));
}

// PHP Task
function phpTask() {
	return src(paths.php.src).pipe(dest(paths.php.dest));
}

// PHP Task Production
function phpTaskProd() {
	return src(paths.php.src).pipe(dest(paths.php.destProd));
}

// json Task
// function jsonTask() {
// 	return src(paths.json.src).pipe(dest(paths.json.dest));
// }

// json Task Production
// function jsonTaskProd() {
// 	return src(paths.json.src).pipe(dest(paths.json.destProd));
// }

// Clean directory
function cleanDist() {
	return del(paths.clean.dist);
}
function cleanAll() {
	return del(paths.clean.all);
}
function cleanHtml() {
	return del(paths.clean.html);
}
function cleanCss() {
	return del(paths.clean.css);
}
function cleanJs() {
	return del(paths.clean.js);
}
function cleanImg() {
	return del(paths.clean.img);
}
function cleanPhp() {
	return del(paths.clean.php);
}
function cleanFonts() {
	return del(paths.clean.fonts);
}
// function cleanJson() {
// 	return del(paths.clean.json);
// }

// Watch Task
function watchTask() {
	watch(paths.html.src, series(cleanHtml, cleanCss, htmlTask, cssTask, browsersyncReload));
	watch(paths.css.src, series(cleanCss, cssTask, browsersyncReload));
	watch(paths.js.src, series(cleanJs, cleanCss, jsTask, cssTask, browsersyncReload));
	watch(paths.img.src, series(cleanImg, imgTask, browsersyncReload));
	watch(paths.fonts.src, series(cleanFonts, fontsTask, browsersyncReload));
	watch(paths.php.src, series(cleanPhp, phpTask, browsersyncReload));
	// watch(paths.json.src, series(cleanJson, jsonTask, browsersyncReload));
}

// Gulp default/build task
exports.default = series(
	cleanAll,
	parallel(htmlTask, cssTask, jsTask, imgTask, fontsTask, phpTask),
	browsersyncServe,
	watchTask
);

// Gulp production task
exports.prod = series(
	cleanDist,
	htmlTaskProd,
	cssTaskProd,
	jsTaskProd,
	imgTaskProd,
	fontsTaskProd,
	phpTaskProd
	// jsonTaskProd,
);
