module.exports = {
  entry: './js/metaverse-min.js',
  //entry: './metaverse-full.js',
  //entry: './metaverse-cdn.js',
  mode: 'production',
  experiments: {
    outputModule: true,
  },  
  output: {
    filename: 'metaverse-babylon.js',
    library: {
      type: 'module'
    }
  },
};