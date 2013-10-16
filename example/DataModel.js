/*
  General GridModel which generate whole slickGrid instance 
  and can be extend with custom parameters.
  
  Using this library you avoid unnecessary work when constructing 
  normal use-case slickGrid instance...
*/

var DataModel = function(options)
{
  var _defaults = {
    columnStaticFilter: columnStaticFilter,
    columnFilters: {},
    dataView: true,
    data: [],
    grid: false,
    dataUrl: false,
    images: {
      group: 'SlickGrid/images/arrow_right_peppermint.png',
    },
    dataComparer: comparer,
    getData: getData,
    useDataFlatter: true,
    useDataSorting: true,
    useDataGrouping: true,
    dataIdField: 'id',
    gridOptions: {
      //enableColumnReorder: false,
      //enableCellNavigation: true,
    },
    gridId: '#myGrid',
    slickPlugins: {
      groupItemMetadataProvider: {
        obj:  newGroupItemMetadataProvider
      },
      distinctMenu: {
        obj: true,
        options: {
          onAfterFilter: onAfterFilter,
        }
      },
      headerMenu: {
        obj: true,
        options: {}
      },
      headerButtons: {
        obj: true,
        options: {}
      }
    }
  }

  function Init(){
    options = $.extend(true, {}, _defaults, options);
    
    if( options.dataUrl ){
      options.slickPlugins.distinctMenu.options.doFilter = doRemoteFilter;
    } else {
      options.slickPlugins.distinctMenu.options.getDistinct = getStaticDistinct;
      options.slickPlugins.distinctMenu.options.doFilter = doStaticFilter;
    }
    
    if( options.dataView === true ){
        var dataViewArgs = {}
        generateDataGroupMenus();
        if( options.useDataGrouping ){
          var groupItemMetadataProvider = options.slickPlugins.groupItemMetadataProvider.obj();
          options.slickPlugins.groupItemMetadataProvider.obj = groupItemMetadataProvider
          dataViewArgs = {
            groupItemMetadataProvider: groupItemMetadataProvider,
            inlineFilters: true
          }
        }
        options.dataView = newDataView(dataViewArgs);
        
    }

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
    if( options.useDataGrouping){
      options.grid.registerPlugin(groupItemMetadataProvider);
    }
    if( options.useDataSorting ){
      options.grid.onSort.subscribe(function(e, args) {
        var comparer = function(a, b) {
          return a[args.sortCol.field] > b[args.sortCol.field];
        }
        options.dataView.sort(comparer, args.sortAsc);
      });
    }
    options.dataView.beginUpdate();
    //set data to dataView
    options.dataView.setItems(options.data);

    if( !options.dataUrl )
      //set column filter
      options.dataView.setFilter(columnStaticFilter);
    options.dataView.endUpdate();

    //add sort event handler
    options.grid.onSort.subscribe(function (e, args) {
      sortdir = args.sortAsc ? 1 : -1;
      sortcol = args.sortCol.field;
      options.dataView.sort(options.dataComparer, args.sortAsc);
    });

    //if headerMenu is purpose to use, create it
    if( options.slickPlugins.headerMenu.obj === true )
    {
      options.slickPlugins.headerMenu.obj = new Slick.Plugins.HeaderMenu(
        options.slickPlugins.headerMenu.options );
      options.grid.registerPlugin(options.slickPlugins.headerMenu.obj);
    }
    //if headerButtons is purpose to use, create it
    if( options.slickPlugins.headerButtons.obj === true )
    {
      options.slickPlugins.headerButtons.obj = new Slick.Plugins.HeaderButtons(
          options.slickPlugins.headerButtons.options);
      options.grid.registerPlugin(options.slickPlugins.headerButtons.obj);
      options.slickPlugins.headerButtons.obj.onCommand.subscribe(onCommand);
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
    if( options.dataUrl )
      options.getData( options.dataUrl, options.slickPlugins.distinctMenu.obj.condition(), onAfterFilter);
    else options.slickPlugins.distinctMenu.obj.update();
  }
  
  function onCommand(e, args)
  {
    if( args.command == 'group' ){
      onGroup(e, args);
      // Stop propagation so that it doesn't register as a header click event.
      e.preventDefault();
      e.stopPropagation();
    }
  }
  function onGroup(e, args){
    console.log('onGrouping..');
    var grouping = options.dataView.getGrouping();
    if( grouping.length == 0 || e.ctrlKey || e.altKey ){
      
      grouping.push({
        getter: args.column.id,
        formatter: function (g, a, b, c) {
          console.log(g);
          return args.column.name+":  " + g.value + "  <span style='color:green'>(" + g.count + " items)</span>";
        },
        collapsed: true,
        /*aggregators: [
          //new Slick.Data.Aggregators.Avg("percentComplete"),
          //new Slick.Data.Aggregators.Sum("cost")
        ],
        aggregateCollapsed: true
        */
      });
    } else {
      grouping = [];
    }
    options.dataView.setGrouping( grouping );
  }
  function generateDataGroupMenus(){
    for(var i in options.columns){
      var column = options.columns[i];
      $.extend(true, column, {header: {buttons: [
          {
            cssClass: 'slick-header-distinctbutton',
            image: options.images.group, 
            command: 'group'}
          ]}});
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
  function getData(url, urlParameters, callback){
     $.getJSON( url, urlParameters
        ).done(function( json  ) {
            if( typeof(json) == 'object' ){
              callback(null, json);
            } else {
              callback('invalid response format');
            }
        }).fail( function(jqxhr, textStatus, error) {
          callback( textStatus + ", " + error );
        });
  }
  function newGroupItemMetadataProvider(){
    return new Slick.Data.GroupItemMetadataProvider()
  }
  function newDataView(args){return new Slick.Data.DataView(args);}
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
  function doStaticFilter(field, condition, callback){
    console.log('doStaticFilter');
    options.columnFilters = {};
    for(var i=0;condition['$and'] && i<condition['$and'].length;i++){
      for(var key in condition['$and'][i] ){
        options.columnFilters[key] = condition['$and'][i][key];
      };
    }
    callback(null, false);
  }
  function doRemoteFilter(field, condition, callback){
    getData( options.dataUrl, {q: JSON.stringify(condition)}, callback);
  }
  function onAfterFilter(error, list){
    if( list===false){
      //options.dataView.setFilterArgs(options.columnFilters);
      options.dataView.refresh();
    } else if (typeof(list) == 'object') {
        if( list ){
        if( list.length > 0 ){
          var i, len=list.length;
          for(i=0;i<len;i++){
            if( options.useDataFlatter)
              list[i] = flatten(list[i]);
            if(options.dataIdField!='id') 
              list[i].id = list[i][options.dataIdField];
          }
        }
      }
      options.data = list;
      options.dataView.beginUpdate();
      options.dataView.setItems(options.data);
      options.dataView.endUpdate();
      options.dataView.refresh();
    }
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
