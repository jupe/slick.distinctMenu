/*
  This is not yet used and might be better to be individual github project... 
  General DataModel which generate whole slickGrid instance with custom parameters 
*/

var DataModel = function(options)
{
  var _defaults = {
    columnStaticFilter: columnStaticFilter,
    columnFilters: {},
    dataView: newDataView(),
    data: [],
    grid: false,
    dataUrl: false,
    dataComparer: comparer,
    getData: getData,
    useDataFlatter: true,
    dataIdField: 'id',
    gridOptions: {
      enableColumnReorder: false,
    },
    gridId: '#myGrid',
    slickPlugins: {
      distinctMenu: {
        obj: true,
        options: {
          getDistinct: getStaticDistinct,
          doFilter: doStaticFilter,
        }
      },
      headerMenu: {
        obj: true,
        options: {}
      }
    }
  }

  function Init(){
    options = $.extend(true, {}, _defaults, options);
    //set data to dataView
    options.dataView.setItems(options.data);
    //set column filter
    options.dataView.setFilter(options.columnStaticFilter);
    //if grid is not yet created, create grid instance
    if(!options.grid)
      options.grid = new Slick.Grid(
        options.gridId, 
        options.dataView, 
        options.columns, 
        options.gridOptions);
    // Make the grid respond to DataView change events.
    options.dataView.onRowCountChanged.subscribe(function (e, args) {
      options.grid.updateRowCount();
      options.grid.render();
    });
    options.dataView.onRowsChanged.subscribe(function (e, args) {
      options.grid.invalidateRows(args.rows);
      options.grid.render();
    });
    //add sort event handler
    options.grid.onSort.subscribe(function (e, args) {
      sortdir = args.sortAsc ? 1 : -1;
      sortcol = args.sortCol.field;
      options.dataView.sort(options.dataComparer, args.sortAsc);
    });

    //if headerMenu is purpose to use, create it
    if( options.slickPlugins.headerMenu.obj === true )
    {
      options.slickPlugins.headerMenu.obj = new Slick.Plugins.HeaderMenu({});
      options.grid.registerPlugin(options.slickPlugins.headerMenu.obj);
    }
    //if distinct menu is purpose to use create it
    if( options.slickPlugins.headerMenu.obj &&
        options.slickPlugins.distinctMenu.obj === true )
      // init distinctMenu
    {
      //Create distinctMenu instance
      options.slickPlugins.distinctMenu.obj = new Slick.Plugins.DistinctMenu(
       $.extend(true, {}, options.slickPlugins.distinctMenu.options, {
          headerMenu: options.slickPlugins.headerMenu.obj,
          columns: options.columns,
          }));
      //register distinctMenu
      options.grid.registerPlugin(options.slickPlugins.distinctMenu.obj);
      
      //and update menu items
      options.slickPlugins.distinctMenu.obj.update();
      
    }
    //if dataUrl is set, fetch data
    if( options.dataUrl ){
      options.getData( function(error, ok){
        //if data is fetched, update distinctMenu
        options.slickPlugins.distinctMenu.obj.update();
      });
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
  function getData(callback){
    $.getJSON(options.url, null, function(data){
      if( options.useDataFlatter ){
        if( data.length > 0 ){
          var i, len=data.length;
          for(i=0;i<len;i++){
            data[i] = flatten(data[i]);
            if(options.dataIdField!='id') 
              data[i].id = data[i][options.dataIdField];
          }
        }
      }
      options.dataView.beginUpdate();
      options.dataView.setItems(data);
      options.dataView.endUpdate();
      callback(null, data.length);
    })
  }
  function newDataView(){return new Slick.Data.DataView();}
  function getStaticDistinct(field, url, urlParameters, callback){
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
    options.columnFilters = {};
    for(var i=0;condition['$and'] && i<condition['$and'].length;i++){
      for(var key in condition['$and'][i] ){
        options.columnFilters[key] = condition['$and'][i][key];
      };
    }
    options.dataView.refresh();
    options.slickPlugins.distinctMenu.obj.update();
  }
  function comparer(a, b) {
    var x = a[sortcol], y = b[sortcol];
    return (x == y ? 0 : (x > y ? 1 : -1));
  }


  this.updateDistinct = function(){
    options.slickPlugins.distinctMenu.obj.update();
  }
  Init();
  return this;
}