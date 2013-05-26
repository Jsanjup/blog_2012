
var models = require('../models/models.js');

// GET /users/25/favourites
exports.index = function(req, res, next) {

// Busqueda del array de posts favoritos de un usuario
  models.Favourite.findAll({where: {userId: req.user.id}})
     .success(function(favourites) {
     	var format = req.params.format || 'html';
    	format = format.toLowerCase();
         // generar array con postIds de los post favoritos
         var postIds = favourites.map( 
                            function(favourite) 
                              {return favourite.postId;}
                           );
        // busca los posts identificados por array postIds
        var patch;
        if (postIds.length == 0) {
            patch= '"Posts"."id" in (NULL)';
        } else {
            patch='"Posts"."id" in ('+postIds.join(',')+')';
        } 
        // busca los posts identificados por array postIds
        models.Post.findAll({order: 'updatedAt DESC',
                    where: patch, 
                    include:[{model:models.User,as:'Author'},
                    models.Favourite ]
                 })
          .success(function(posts) {
                          
            switch (format) { 
              case 'html':
              case 'htm':
                  res.render('posts/index', {
                    posts: posts
                  });
                  break;
              case 'json':
                  res.send(posts);
                  break;
              case 'xml':
                  res.send(posts_to_xml(posts));
                  break;
              case 'txt':
                  res.send(posts.map(function(post) {
                      return post.title+' ('+post.body+')';
                  }).join('\n'));
                  break;
              default:
                  console.log('No se soporta el formato \".'+format+'\" pedido para \"'+req.url+'\".');
                  res.send(406);
            }
        })
        .error(function(error) {
            next(error);
        });
   });
}