
var models = require('../models/models.js');


/*
*  Auto-loading con app.param
*/
exports.load = function(req, res, next, id) {

   models.Post
        .find({where: {id: Number(id)}})
        .success(function(post) {
            if (post) {
                req.post = post;
                next();
            } else {
                req.flash('error', 'No existe el post con id='+id+'.');
                next('No existe el post con id='+id+'.');
            }
        })
        .error(function(error) {
            next(error);
        });
};



/*
* Comprueba que el usuario logeado es el author.
*/
exports.loggedUserIsAuthor = function(req, res, next) {
    
    if (req.session.user && req.session.user.id == req.post.authorId) {
        next();
    } else {
        console.log('Operación prohibida: El usuario logeado no es el autor del post.');
        res.send(403);
    }
};


//-----------------------------------------------------------

// GET /posts
exports.index = function(req, res, next) {

    var format = req.params.format || 'html';
    format = format.toLowerCase();

    models.Post
        .findAll({order: 'updatedAt DESC',
	                include: [ { model: models.User, as: 'Author' }, models.Favourite ]
	      })
        .success(function(posts) {
            var favs= [];
            for(var i in posts){
              var usuario=false;
              for(var j in posts[i].favourites){
                if(req.session.user && (posts[i].favourites[j].userId == req.session.user.id){
                  console.log("entra en el bucle");
                  favs.push(true);
                  usuario=true;
                }
              }
              if(!usuario) favs.push(false);
            }
            console.log("favs a renderizar "+favs);
            switch (format) { 
              case 'html':
              case 'htm':
                  res.render('posts/index', {
                    posts: posts,
                    favourite: favs
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
};

function posts_to_xml(posts) {

    var builder = require('xmlbuilder');
    var xml = builder.create('posts')
    for (var i in posts) {
        xml.ele('post')
              .ele('id')
                 .txt(posts[i].id)
                 .up()
              .ele('title')
                 .txt(posts[i].title)
                 .up()
              .ele('body')
                 .txt(posts[i].body)
                 .up()
              .ele('authorId')
                 .txt(posts[i].authorId)
                 .up()
              .ele('createdAt')
                 .txt(posts[i].createdAt)
                 .up()
              .ele('updatedAt')
                 .txt(posts[i].updatedAt);
    }
    return xml.end({pretty: true});
}


// GET /posts/33
exports.show = function(req, res, next) {

    // Buscar el autor
    models.User
        .find({where: {id: req.post.authorId}})
        .success(function(user) {
            // Si encuentro al autor lo añado como el atributo author, sino añado {}.
            req.post.author = user || {};
            models.Favourite.find({where: {postId: req.post.id, userId: req.session.user.id}})
                          .success( function(favorito){
            // Buscar Adjuntos
            req.post.getAttachments({order: 'updatedAt DESC'})
               .success(function(attachments) {
            
                  // Buscar comentarios
                  models.Comment
                       .findAll({where: {postId: req.post.id},
                                 order: 'updatedAt DESC',
                                 include:[{model:models.User,as:'Author'}]

                       })
                       .success(function(comments) {
                          var format = req.params.format || 'html';
                          format = format.toLowerCase();
                          switch (format) { 
                            case 'html':
                            case 'htm':
                                var new_comment = models.Comment.build({
                                    body: 'Introduzca el texto del comentario'
                                });
                                res.render('posts/show', {
                                    post: req.post,
                                    comments: comments,
                                    comment: new_comment,
                                    attachments: attachments,
                                    favourite: favorito
                                });
                                break;
                            case 'json':
                                res.send(req.post);
                                break;
                            case 'xml':
                                res.send(post_to_xml(req.post));
                                break;
                            case 'txt':
                                res.send(req.post.title+' ('+req.post.body+')');
                                break;
                            default:
                                console.log('No se soporta el formato \".'+format+'\" pedido para \"'+req.url+'\".');
                                res.send(406);
                          }
                        }).error(function(error) {
                           next(error);
                       })
                    })
                    .error(function(error) {
                           next(error);
                    })
                })
               .error(function(error) {
                   next(error);
                });
        })
        .error(function(error) {
            next(error);
        });
};

function post_to_xml(post) {

    var builder = require('xmlbuilder');
    if (post) {
       var xml = builder.create('post')
              .ele('id')
                 .txt(post.id)
                 .up()
              .ele('title')
                 .txt(post.title)
                 .up()
              .ele('body')
                 .txt(post.body)
                 .up()
              .ele('authorId')
                 .txt(post.authorId)
                 .up()
              .ele('createdAt')
                 .txt(post.createdAt)
                 .up()
              .ele('updatedAt')
                 .txt(post.updatedAt);
       return xml.end({pretty: true});
    } else {
       var xml = builder.create('error')
                           .txt('post no existe');
       return xml.end({pretty: true});
    }
};

// GET /posts/new
exports.new = function(req, res, next) {

    var post = models.Post.build(
        { title:  'Introduzca el titulo',
          body: 'Introduzca el texto del articulo'
        });
    
    res.render('posts/new', {post: post});
};

// POST /posts
exports.create = function(req, res, next) {

    var post = models.Post.build(
        { title: req.body.post.title,
          body: req.body.post.body,
          authorId: req.session.user.id
        });
    
    var validate_errors = post.validate();
    if (validate_errors) {
        console.log("Errores de validación:", validate_errors);

        req.flash('error', 'Los datos del formulario son incorrectos.');
        for (var err in validate_errors) {
           req.flash('error', validate_errors[err]);
        };

        res.render('posts/new', {post: post,
                                 validate_errors: validate_errors});
        return;
    } 
    
    post.save()
        .success(function() {
            req.flash('success', 'Post creado con éxito.');
            res.redirect('/posts');
        })
        .error(function(error) {
            next(error);
        });
};

// GET /posts/33/edit
exports.edit = function(req, res, next) {

    res.render('posts/edit', {post: req.post});
};

// PUT /posts/33
exports.update = function(req, res, next) {

    req.post.title = req.body.post.title;
    req.post.body = req.body.post.body;
                
    var validate_errors = req.post.validate();
    if (validate_errors) {
        console.log("Errores de validación:", validate_errors);

        req.flash('error', 'Los datos del formulario son incorrectos.');
        for (var err in validate_errors) {
            req.flash('error', validate_errors[err]);
        };

        res.render('posts/edit', {post: req.post,
                                  validate_errors: validate_errors});
        return;
    } 
    req.post.save(['title', 'body'])
        .success(function() {
            req.flash('success', 'Post actualizado con éxito.');
            res.redirect('/posts');
        })
        .error(function(error) {
            next(error);
        });
};

// DELETE /posts/33
exports.destroy = function(req, res, next) {

    var Sequelize = require('sequelize');
    var chainer = new Sequelize.Utils.QueryChainer

    var cloudinary = require('cloudinary');

    // Obtener los comentarios
    req.post.getComments()
       .success(function(comments) {
           for (var i in comments) {
                // Eliminar un comentario
                chainer.add(comments[i].destroy());
           }

           // Obtener los adjuntos
           req.post.getAttachments()
              .success(function(attachments) {
                  for (var i in attachments) {
                      // Eliminar un adjunto
                      chainer.add(attachments[i].destroy());

                      // Borrar el fichero en Cloudinary.
                      cloudinary.api.delete_resources(attachments[i].public_id,
                                    function(result) {},
                                    {resource_type: 'raw'});
                  }

                  // Eliminar el post
                  chainer.add(req.post.destroy());

                  // Ejecutar el chainer
                  chainer.run()
                      .success(function(){
                          req.flash('success', 'Post (y sus comentarios y adjuntos) eliminado con éxito.');
                          res.redirect('/posts');
                      })
                      .error(function(errors){
                          next(errors[0]);   
                      })
              })
              .error(function(error) {
                  next(error);
              });
       })
       .error(function(error) {
           next(error);
       });
};
