
var models = require('../models/models.js');

// GET /posts
exports.index = function(req, res, next) {

    var format = req.params.format || 'html';
    format = format.toLowerCase();

    models.Post
        .findAll({order: 'updatedAt DESC'})
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
            console.log("Error: No puedo listar los posts.");
            res.redirect('/');
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

    var format = req.params.format || 'html';
    format = format.toLowerCase();

    var id =  req.params.postid;
    
    models.Post
        .find({where: {id: Number(id)}})
        .success(function(post) {
            switch (format) { 
              case 'html':
              case 'htm':
                  if (post) {
                    res.render('posts/show', { post: post });
                  } else {
                    console.log('No existe ningun post con id='+id+'.');
                    res.redirect('/posts');
                  }
                  break;
              case 'json':
                  res.send(post);
                  break;
              case 'xml':
                     res.send(post_to_xml(post));
                  break;
              case 'txt':
                  res.send(post.title+' ('+post.body+')');
                  break;
              default:
                  console.log('No se soporta el formato \".'+format+'\" pedido para \"'+req.url+'\".');
                  res.send(406);
            }
        })
        .error(function(error) {
            console.log(error);
            res.redirect('/');
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
          authorId: 0
        });
    
    var validate_errors = post.validate();
    if (validate_errors) {
        console.log("Errores de validacion:", validate_errors);
        res.render('posts/new', {post: post});
        return;
    } 
    
    post.save()
        .success(function() {
            res.redirect('/posts');
        })
        .error(function(error) {
            console.log("Error: No puedo crear el post:", error);
            res.render('posts/new', {post: post});
        });
};

// GET /posts/33/edit
exports.edit = function(req, res, next) {

    var id =  req.params.postid;
    
    models.Post
        .find({where: {id: Number(id)}})
        .success(function(post) {
            if (post) {
                res.render('posts/edit', {post: post});
            } else {
                console.log('No existe ningun post con id='+id+'.');
                res.redirect('/posts');
            }
        })
        .error(function(error) {
            console.log(error);
            res.redirect('/');
        });
};

// PUT /posts/33
exports.update = function(req, res, next) {

    var id =  req.params.postid;
    
    models.Post
        .find({where: {id: Number(id)}})
        .success(function(post) {
            if (post) {
                post.title = req.body.post.title;
                post.body = req.body.post.body;
                
                var validate_errors = post.validate();
                if (validate_errors) {
                    console.log("Errores de validacion:", validate_errors);
                    res.render('posts/edit', {post: post});
                    return;
                } 
                post.save(['title', 'body'])
                    .success(function() {
                        res.redirect('/posts');
                    })
                    .error(function(error) {
                        console.log("Error: No puedo editar el post:", error);
                        res.render('posts/edit', {post: post});
                    });
            } else {
                console.log('No existe ningun post con id='+id+'.');
                res.redirect('/posts');
            }
        })
        .error(function(error) {
            console.log(error);
            res.redirect('/');
        });
};

exports.search= function(req, res, next){
    var string=req.query.search_string || "";
    var partido= string.split(" ");
    string="%";
    for(var i in partido)
      string+=partido[i]+"%";
    console.log(string);
    models.Post
      .findAll({where: ["title like ? OR body like ?", string, string], order: "updatedAt DESC"})
      .success(function(posts_found) {
             res.render('posts/index_search', {posts_found: posts_found});
        })
      .error(function(error) {
            console.log("Error: No puedo listar los posts.");
            res.redirect('/');
        });
    //res.render('posts/search', {post: post});
};

// DELETE /posts/33
exports.destroy = function(req, res, next) {

    var id =  req.params.postid;
    
    models.Post
        .find({where: {id: Number(id)}})
        .success(function(post) {
            if (post) {
                
                post.destroy()
                    .success(function() {
                        res.redirect('/posts');
                    })
                    .error(function(error) {
                        console.log("Error: No puedo eliminar el post:", error);
                        res.redirect('back');
                    });
            } else {
                console.log('No existe ningun post con id='+id+'.');
                res.redirect('/posts');
            }
        })
        .error(function(error) {
            console.log(error);
            res.redirect('/');
        });
};
