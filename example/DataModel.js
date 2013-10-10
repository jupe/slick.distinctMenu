/*
  This is not yet used and might be better to be individual github project... 
  General DataModel which generate whole slickGrid instance with custom parameters 
*/

var DataModel = function(options)
  var _defaults = {
    columnStaticFilter: filter,
    columnFilters = {}
    dataView: newDataView(),
    data: [],
    grid: false,
    useHeaderMenu: true,
    gridOptions: {
      enableColumnReorder: false,
    }
    gridId: false,
    slickPlugins: {
      distinctMenu: {
        obj: false,
        options
      }
    }
  }

  function Init(){
    options = $.extend(true, {}, _defaults, options);
    options.dataView.setItems(options.data);
    options.dataView.setFilter(options.columnStaticFilter);
    if(!options.grid)
      options.grid = new Slick.Grid(
        options.gridId, 
        options.dataView, 
        options.columns, 
        options.gridOptions);
    // Make the grid respond to DataView change events.
    if( options.useHeaderMenu )
    {
      options.dataView.onRowCountChanged.subscribe(function (e, args) {
        grid.updateRowCount();
        grid.render();
      });

      options.dataView.onRowsChanged.subscribe(function (e, args) {
        grid.invalidateRows(args.rows);
        grid.render();
      });
      options.slickPlugins.obj.headerMenuPlugin = new Slick.Plugins.HeaderMenu({});
      options.grid.registerPlugin(options.slickPlugins.obj.headerMenuPlugin);
      // init distinctMenu
      if( options.useDistinctMenus ) {
        options.slickPlugins.obj.distinctMenuPlugin = new Slick.Plugins.DistinctMenu(
         $.extend(true, {}, options.slickPlugin.options, {
            headerMenu: options.slickPlugins.obj.headerMenuPlugin,
            columns: options.columns,
            }));
        options.grid.registerPlugin(options.slickPlugins.obj.distinctMenuPlugin);
        //and update menu items
        options.slickPlugins.distinctMenuPlugin.update();
      }
    }
  }

  function columnStaticFilter(item) {
    for(var field in options.columnFilters)
    {
      if( item!==undefined && item[field]!== options.columnFilters[field] )
      {
        return false;
      }
    }
    return true;
  }
  function newDataView(){return new Slick.Data.DataView();}
  function getStaticDistinct(field, url, urlParameters, callback){
    console.log('getDistinct');
    function getDist(field){
      var i=0,list = [];
      options.data.forEach( function(row){
        if( row[field] && list.indexOf( row[field] )== -1 ){
          list.push( row[field] );
        }
      });
      return list;
    }
    callback(null,  getDist(field)); 
  }
  function doStaticFilter(field, condition){
    console.log('doFilter');
    options.columnFilters = {};
    for(var i=0;condition['$and'] && i<condition['$and'].length;i++){
      for(var key in condition['$and'][i] ){
        columnFilters[key] = condition['$and'][i][key];
      };
    }
    options.dataView.refresh();
    options.slickPlugins.distinctMenuPlugin.update();
  }
  this.updateDistinct = function(){
    options.slickPlugins.distinctMenuPlugin.update();
  }
  Init();
  return this;
}