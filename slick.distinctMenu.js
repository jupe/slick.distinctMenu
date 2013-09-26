(function ($) {
  // register namespace
  $.extend(true, window, {
    "Slick": {
      "Plugins": {
        "DistinctMenu": DistinctMenu
       }
    }
  });
  function DistinctMenu(options){
    var _grid;
    var _self = this;
    var _handler = new Slick.EventHandler();
    var _defaults = {
      command: 'filter',            //headerMenuItem command key
      headerMenu: false,            //headerMenuPlugin instance
      columns: [],                  //columns object which was used in headerMenuPlugin
      url: '/items',                //default url for query distinct arrays (JSON format)
      urlParameters: null,          //extra parameters for url string
      exclude: [],                  //exclude column id's
      doUrl: doUrl,                 //function that generate url.        f(field, condition)
      doCondition: doCondition,     //function that generate conditions. f(field, value){
      doFilter: doFilter,           //function that fetch data           f(field, condition)
      onReady: onReady,             //function when menus are ready      f(columns) -> grid.setColumns(columns); grid.render();
      selectIcon: "/js/vendor/SlickGrid/images/tick.png",
      condition: {$and: []}         //internal condition
    };
    
    function init(grid) {
      //Init plugin
      options = $.extend(true, {}, _defaults, options);
      _grid = grid;
      condition(false);
      options.headerMenu.onCommand.subscribe(onCommand);
      console.log('distinctMenu initialized');
    }
    
    // Condition handler
    function condition(field, condition, or){
      var obj = {}
      if( field === false ){
        options.condition['$and'] = [];
        for (var i=1;i<=options.columns.length;i++){
          options.condition['$and'].push({});
        }
      } else if(field && condition ) {
        var col = getColumnIndexByField(field);
        if( or ) {
          if( !options.condition['$and'][col]['$or'] ){
            var org = JSON.stringify(options.condition['$and'][col]);
            options.condition['$and'][col] = {};
            options.condition['$and'][col]['$or'] = [ JSON.parse(org) ];
          }
          options.condition['$and'][col]['$or'].push( condition );
        } else {
          options.condition['$and'][col] = condition;
        }
      }
      function cleanCondition(myObjects)
      {
        return {'$and': myObjects['$and'].filter(function (val) {
            return Object.keys(val).length!=0;
        })};
      }
      return cleanCondition(options.condition);
    }
    function getColumnIndexByField(field)
    {
      var i;
      for(i=0;i<options.columns.length;i++){
        if( options.columns[i].field == field ) return i;
      } return;
    }
    function onCommand(e, args) {
      
      if( args.command == options.command ){
        //options.exclude = args.column.field
        setSelection(args.column, args.item, e.ctrlKey);
        condition(args.column.field, args.item.condition, e.ctrlKey);
        options.doFilter( args.column.field, condition() );
      } else if( args.command == 'filter' ) {
        setSelection(args.column, args.item, e.ctrlKey);
        condition(args.column.field, args.item.condition, e.ctrlKey);
        options.doFilter( args.column.field, condition() );
      }
    }
    function destroy() {
      _handler.unsubscribeAll();
      console.log('distinctMenu destroyed');
    }
    function setSelection(column, item, or){
      $.extend(true, column, {header: {menu: {items: []}}})
      var items = column.header.menu.items;
      items.forEach( function( value ) {
        if( value.command == options.command ){
          //belong to distinct menus
          if( value.title === item.title ){
            value.iconImage = options.selectIcon;
          } else if(!or){
            value.iconImage = false;
          }
        }
      });
    }
    function onReady(columns){
      _grid.setColumns(columns);
      _grid.render();
      console.log('ready');
    }
    function doUrl(field, condition){      
      if( typeof(condition)=='object'){
        condition = JSON.stringify(condition);
      }
      var url = options.url+'?t=distinct&f='+field;
      if( condition ) url +='&q='+condition;
      return url;
    }
    
    function doCondition(field, value){
      var cond = {}
      cond[field] = value;
      return cond;
    }
    
    var updateDistinct = function(items, i, callback){
      
      if( i < items.length ) {
        if( options.exclude.indexOf(items[i].id)>=0 || items[i].name[0]==='<' ) {
          updateDistinct(items, i+1, callback);
          return;
        }
        var url = false;
        if( typeof(options.doUrl)=='function'){
          url = options.doUrl(items[i].field, options.condition);
        }else {
          console.error('doUrl function missing!');
          //doError({error: 'doUrl function missing!');
          return;
        }
        console.log(url); //debug print
        $.getJSON( url, $.extend({json: true}, options.urlParameters)
        ).done(function( json  ) {
            if( json.length ){
              setColumnMenuFilters(i, items[i], json);
            } else {
              console.error('invalid response format');
            }
            updateDistinct(items, i+1, callback);
        }).fail(function(jqxhr, textStatus, error) {
          var err = textStatus + ", " + error;
          console.error( "Request Failed: " + err );
          updateDistinct(items, i+1, callback);
        });
      } else {
        callback(options.columns);
      }
    }
    function updateMenus(){
      updateDistinct(options.columns, 0, options.onReady);
    }
    function doFilter(field, condition){
      console.log('Filteringing with condition: '+JSON.stringify(condition) );
    }
    function removeFunction (myObjects,prop,valu)
    {
      return myObjects.filter(function (val) {
          return val[prop] !== valu;
      });
    }
    function setColumnMenuFilters(coll, item, distinct){
      console.log('setColumnMenuFilters: '+distinct);
      $.extend(true, options.columns[coll], {header: {menu: {items: []}}})
      
      //remove old items (only where command is "distinct")
      var items = options.columns[coll].header.menu.items;
      options.columns[coll].header.menu.items = removeFunction(items, 'command', options.command);
      var items = options.columns[coll].header.menu.items;
      //push "all" button
      items.push( {           
        command: options.command,
        title: 'All',
        condition: {},
        iconImage: options.selectIcon,
      });
      //push individual items
      distinct.forEach( function( value ) {
        console.log('addItem: '+value);
        items.push({
          command: options.command,
          title: value,
          condition: options.doCondition(item.field, value),
        });     
      });
        
    }
    $.extend(this, {
      "init": init,
      "destroy": destroy,
      "update": updateMenus,
      //"onBeforeMenuShow": new Slick.Event(),
      //"onCommand": new Slick.Event()
    });
  }
})(jQuery);   