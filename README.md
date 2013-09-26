slick.distinctMenu
==================

SlickGrid plugin for distinct column possible values from back-end.

Features:
-generate own urls which fetch json data from backend
-exclude column distincts


```

var headerMenuPlugin = new Slick.Plugins.HeaderMenu({});
grid.registerPlugin(headerMenuPlugin);
var distinctMenuPlugin = new Slick.Plugins.DistinctMenu(
    { headerMenu: headerMenuPlugin,
      columns: columns,
      exclude: ['title', 'description'],
      url: '/items',
      doUrl: function(field, condition){      
        if( typeof(condition)=='object'){
          condition = JSON.stringify(condition);
        }
        
        var url = '/items?t='+distinct+'&f='+field+'q='+condition;
        return url;
      },
      doFilter: functino(field, condition){
        //fetch new data from backend....
      }
    }
  );
  grid.registerPlugin(distinctMenuPlugin);
  distinctMenuPlugin.update();
  

```
