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
    date: false,
    grid: false,
    refreshPeriod: 1000,
    refreshField: 'date',
    dataUrl: false,
    images: {
      group: '/js/vendor/SlickGrid/images/arrow_right_peppermint.png',
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
    pagerId: false,
    slickPlugins: {
      groupItemMetadataProvider: {
        obj:  newGroupItemMetadataProvider
      },
      distinctMenu: {
        obj: true,
        options: {
          onAfterFilter: onAfterFilter,
          //getDistinct: getStaticDistinct,
          //doFilter: doStaticFilter,
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
      //this.getStaticDistinct = getStaticDistinct;
      //this.doStaticFilter = doStaticFilter;
      options.slickPlugins.distinctMenu.options.doFilter = doRemoteFilter;
    } else {
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
    //set data to dataView
    options.dataView.setItems(options.data);

    //set column filter
    //options.dataView.setFilter(columnStaticFilter);
    
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
    if( options.pagerId ){
      $.extend(true, options, {slickPlugins: {
        Pager: {obj: new Slick.Controls.Pager(options.dataView, options.grid, $(options.pagerId))}
      }});
    }
    
    options.getData( options.dataUrl, options.slickPlugins.distinctMenu.obj.condition(), onAfterFilter);
    options.date = new Date();
    if( options.refreshPeriod >= 0 && options.refreshField) {
      //setInterval( refresh, options.refreshPeriod );
    }
  }
  function refresh()
  {
    var condition = {}
    condition[options.refreshField] =  {$gte: options.date}
    options.slickPlugins.distinctMenu.obj.condition(options.refreshField, condition);
    Atari.getJSON( options.dataUrl+
      '?q='+JSON.stringify(options.slickPlugins.distinctMenu.obj.condition() ), 
      function(err, data){
      if( data && data.length > 0 ){
        console.log("New logs "+data.length);
        options.date = new Date();
        options.dataView.beginUpdate();
        data.forEach( function(row){
          row.id = row._id|row.uuid;
          //options.data.push(row);
          options.dataView.addItem(row);
        });
        options.dataView.endUpdate();
        options.dataView.refresh();
        //options.grid.refresh();
      }
    });
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
    callback();
  }
  function doRemoteFilter(field, condition, callback){
    getData( options.dataUrl, {q: JSON.stringify(condition)}, callback);
  }
  function onAfterFilter(error, list){
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
    options.slickPlugins.distinctMenu.obj.update();
  }
  
  function comparer(a, b) {
    var x = a[sortcol], y = b[sortcol];
    return (x == y ? 0 : (x > y ? 1 : -1));
  }


  this.updateDistinct = function(){
    options.slickPlugins.distinctMenu.obj.update();
  }
  this.Grid = function(){
    return options.grid;
  }
  this.DataView = function(){
    return options.dataView;
  }
  this.Data = function(){
    return options.data;
  }
  Init();
  return this;
}
