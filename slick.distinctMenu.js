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
      command: 'filter',    //headerMenuItem command key
      headerMenu: false,    //headerMenuPlugin instance
      columns: [],          //columns object which was used in headerMenuPlugin
      url: '/items',        //default url for query distinct arrays (JSON format)
      urlParameters: null,  //extra parameters for url string
      exclude: [],          //exclude column id's
      
      doUrl: doUrl,
      doCondition: doCondition,
      doFilter: doFilter,
      onReady: onReady,
      
    };
  
    function init(grid) {
      options = $.extend(true, {}, _defaults, options);
      _grid = grid;
      options.headerMenu.onCommand.subscribe(onCommand);
      console.log('distinctMenu initialized');
    }
    function onCommand(e, args) {
      if( args.command == options.command ){
        
        //options.exclude = args.column.field
        if( args.item.condition ) {
          options.doFilter( args.column.field, args.item.condition );
        }
      }
    }
    function destroy() {
      _handler.unsubscribeAll();
      console.log('distinctMenu destroyed');
      //$(document.body).unbind("mousedown", handleBodyMouseDown);
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
      console.log('generated condition: '+JSON.stringify(cond) );
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
        console.log(url);
        $.getJSON( url, options.urlParameters
        ).done(function( json  ) {
            if( json.length ){
              setColumnMenuFilters(i, items[i], json);
            } else {
              console.error('invalid response format');
            }
            updateDistinct(items, i+1, callback);
        }).fail(function(jqxhr, textStatus, error) {
          var err = textStatus + ", " + error;
          console.log( "Request Failed: " + err );
          updateDistinct(items, i+1, callback);
        });
      } else {
        callback(options.columns);
      }
    }
    function update(){
      updateDistinct(options.columns, 0, options.onReady);
    }
    function doFilter(field, condition){
      console.log('Filteringing with condition: '+JSON.stringify(condition) );
    }
    function setColumnMenuFilters(coll, item, distinct){
      console.log('setColumnMenuFilters: '+distinct);
      if( options.columns[coll].header && 
          options.columns[coll].header.menu &&
          options.columns[coll].header.menu.items ) {
        console.log('loop cols');
        
        var items = options.columns[coll].header.menu.items;
        //items = items.slice(0,1);
        distinct.forEach( function( value ) {
          console.log('addItem: '+value);
          /*
            var list = []
            var menu = options.columns[items[i].column].header.menu.items;
            options.columns[items[i].column].header.menu.items = menu;
            
            //
            $.each(ret, function(j, item){
              if( items[i].getFunc ) {
                item = items[i].getFunc(item);
                if( !item ) return;
              }
              if( list.indexOf(item)==-1 )
                list.push(item);
            });
            $.each(list, function(j, item){
              var cond = {}
              
              if( items[i].condFunc ) {
                cond = items[i].condFunc(item);
              }
              else {
                cond[items[i].field] = item;
              }
              columns[items[i].column].header.menu.items.push(
              {
                command: items[i].command,
                title: item,
                condition: cond
              });     
              
            });
            updateFilter(items, i+1, callback);
          });*/
          items.push(
            {
              command: options.command,
              title: value,
              condition: doCondition(item.field, value)
            });     
        });
      }
    }
    $.extend(this, {
      "init": init,
      "destroy": destroy,
      "update": update
      //"onBeforeMenuShow": new Slick.Event(),
      //"onCommand": new Slick.Event()
    });
  }
})(jQuery);   
