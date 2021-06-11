// Тут собирается проект
let project_folder = "resources";
// Папка с исходниками
let source_folder = "build";

// Автоподключение шрифтов
let fs = require("fs");

// Пути к файлам и папкам
let path = {
    // Путь куда выгружаются файлы
    build: {
        html: project_folder + "/",
        css: project_folder + "/css/",
        js: project_folder + "/js/",
        img: project_folder + "/img/",
        fonts: project_folder + "/fonts/",
    },
    // Путь откуда выгружаются файлы
    src: {
        html: [source_folder + "/*.html", "!" + source_folder + "/_*.html"],
        css: source_folder + "/scss/main.scss",
        js: source_folder + "/js/script.js",
        img: source_folder + "/img/**/*.{jpg,png,svg,gif,ico,webp}",
        fonts: source_folder + "/fonts/*.ttf",
    },
    // Путь отслеживания файлов постоянно (слушать изменения файлов)
    watch: {
        html: source_folder + "/**/*.html",
        css: source_folder + "/scss/**/*.scss",
        js: source_folder + "/js/**/*.js",
        img: source_folder + "/img/**/*.+(png|jpg|gif|ico|svg|webp)",
    },
    // Объект отвечающий за удаление папки при запуске gulp
    clean: "./" + project_folder + "/",
};

// Обращение к gulp
let {
  src,
  dest
} = require("gulp"),
  gulp = require("gulp"),
  // Обновление стр.
  browsersync = require("browser-sync").create(),
  fileinclude = require("gulp-file-include"),
  del = require("del"),
  scss = require("gulp-sass"),
  autoprefixer = require("gulp-autoprefixer"),
  group_media = require("gulp-group-css-media-queries"),
  // Оптимизация CSS файла
  clean_css = require("gulp-clean-css"),
  rename = require("gulp-rename"),
  // Оптимизация JS файла
  uglify = require("gulp-uglify-es").default,
  // Оптимизация img
  imagemin = require("gulp-imagemin"),
  webp = require("gulp-webp"),
  webphtml = require("gulp-webp-html"),
  webpcss = require("gulp-webpcss"),
  svg_sprite = require("gulp-svg-sprite"),
  //Оптимизация шрифтов
  ttf2woff = require("gulp-ttf2woff"),
  ttf2woff2 = require("gulp-ttf2woff2"),
  fonter = require("gulp-fonter");

function browserSync() {
    browsersync.init({
        server: {
            baseDir: "./" + project_folder + "/",
        },
        port: 3000,
        // Отключение уведомления
        notify: false,
    });
}

// Работа с HTML
function html() {
  return (
    src(path.src.html)
    // Pipe команды для Gulp
    .pipe(fileinclude())
    .pipe(webphtml())
    .pipe(dest(path.build.html))
    .pipe(browsersync.stream())
  );
}

// Работа с CSS
function css() {
  return (
    src(path.src.css)
    // Pipe команды для Gulp
    .pipe(
      scss({
        outputStyle: "expanded",
      })
    )
    .pipe(group_media())
    .pipe(
      autoprefixer({
        overrideBrowserlist: ["last 5 versions"],
        cascade: true,
      })
    )
    .pipe(
      webpcss({
        webpClass: ".webp",
        noWebpClass: ".no-webp",
      })
    )
    .pipe(dest(path.build.css))
    .pipe(clean_css())
    .pipe(
      rename({
        extname: ".min.css",
      })
    )
    .pipe(dest(path.build.css))
    .pipe(browsersync.stream())
  );
}

// Работа с JS
function js() {
  return (
    src(path.src.js)
    // Pipe команды для Gulp
    .pipe(fileinclude())
    .pipe(dest(path.build.js))
    .pipe(uglify())
    .pipe(
      rename({
        extname: ".min.js",
      })
    )
    .pipe(dest(path.build.js))
    .pipe(browsersync.stream())
  );
}

// Работа с img
function images() {
  return (
    src(path.src.img)
    // Pipe команды для Gulp
    .pipe(
      webp({
        quality: 70,
      })
    )
    .pipe(dest(path.build.img))
    .pipe(src(path.src.img))
    .pipe(
      imagemin({
        progressive: true,
        svgoPlugins: [{
          removeViewBox: false,
        }, ],
        interlaced: true,
        optimizationLevel: 3, // 0 to 7
      })
    )
    .pipe(dest(path.build.img))
    .pipe(browsersync.stream())
  );
}

function fonts() {
    src(path.src.fonts).pipe(ttf2woff()).pipe(dest(path.build.fonts));
    return src(path.src.fonts).pipe(ttf2woff2()).pipe(dest(path.build.fonts));
}

// Иной формат шрифтов otf
gulp.task("otf2ttf", function () {
    return gulp
        .src([source_folder + "/fonts/*.otf"])
        .pipe(
            fonter({
                formats: ["ttf"],
            })
        )
        .pipe(dest(source_folder + "/fonts/"));
});

// Svg sprites. Подключать отдельно
gulp.task("svg_sprite", function () {
    return gulp
        .src([source_folder + "/iconsprite/*.svg"])
        .pipe(
            svg_sprite({
                mode: {
                    stack: {
                        sprite: "../icons/icons.svg",
                        example: true, // Файл с примерам спрайта
                    },
                },
            })
        )
        .pipe(dest(path.build.img));
});

// Подключение шрифтов
function fontsStyle(params) {
  let file_content = fs.readFileSync(source_folder + '/scss/base/_fonts.scss');
  if (file_content == '') {
    fs.writeFile(source_folder + '/scss/base/_fonts.scss', '', cb);
    return fs.readdir(path.build.fonts, function (err, items) {
      if (items) {
        let c_fontname;
        for (var i = 0; i < items.length; i++) {
          let fontname = items[i].split('.');
          fontname = fontname[0];
          if (c_fontname != fontname) {
            fs.appendFile(source_folder + '/scss/base/_fonts.scss', '@include font("' + fontname + '", "' + fontname + '", "400", "normal");\r\n', cb);
          }
          c_fontname = fontname;
        }
      }
    })
  }

}

// CallBack
function cb() {
}

// Слежка за файлами
function watchFiles() {
    gulp.watch([path.watch.html], html);
    gulp.watch([path.watch.css], css);
    gulp.watch([path.watch.js], js);
    gulp.watch([path.watch.img], images);
}

// Автоудаление папки dist
function clean() {
    return del(path.clean);
}

// Различные функции
let build = gulp.series(clean, gulp.parallel(js, css, html, images, fonts), fontsStyle);
//Слежка
let watch = gulp.parallel(build, watchFiles, browserSync);

// Работа gulp с переменными
exports.fontsStyle = fontsStyle;
exports.fonts = fonts;
exports.images = images;
exports.js = js;
exports.css = css;
exports.html = html;
exports.build = build;
exports.watch = watch;
exports.default = watch;