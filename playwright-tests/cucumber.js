module.exports = {
  default: {
    paths: ["features/**/*.feature"],
    require: [
      "features/support/**/*.js",
      "features/step-definitions/**/*.js",
    ],
    format: ["progress"],
    publishQuiet: true,
  },
};
