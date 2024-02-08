var Post = require("../models/post");
var Post_like = require("../models/post_like");
var Post_comment = require("../models/post_comments");
var Usuario_amigo = require("../models/usuario_amigo");
var Usuario = require("../models/usuario");
var Notificacion = require("../models/notificacion");
var sharp = require("sharp");

var path = require("path");
var fs = require("fs");

const AWS = require("aws-sdk"); //servicio s3

AWS.config.update({
  secretAccessKey: process.env.AWS_KEY_ID,
  accessKeyId: process.env.AWS_KEY_ACCESS,
  region: process.env.AWS_REGION, // Ejemplo: 'us-east-1'
});

const s3 = new AWS.S3();

const create_post = async function (req, res) {
  if (req.user) {
    try {
      let data = req.body;
      var rutaPost = {};

      if (data.tipo === "Imagen") {
        if (req.files && req.files.media && req.files.media.path) {
          let img = req.files.media.path;
          const imageNameWithoutExtension = path.parse(img).name;
          const webpImg = imageNameWithoutExtension + ".webp";
          data.media = webpImg;

          sharp(img)
            .webp()
            .resize({ width: 800, height: 600, fit: "inside" })
            .toBuffer()
            .then((resizedImageBuffer) => {
              // Save the resized image buffer to S3
              const rutaPost = {
                Bucket: process.env.AWS_BUCKET,
                Key: "posts/" + webpImg,
                Body: resizedImageBuffer,
                ACL: "public-read",
              };

              s3.upload(rutaPost, (err, data) => {
                if (err) {
                  console.error("Error uploading to S3:", err);
                  return res
                    .status(500)
                    .json({ error: "Failed to upload to S3" });
                }
              });
            })
            .catch((err) => {
              console.error("Error al convertir la imagen a WebP:", err);
              return res
                .status(500)
                .json({ error: "Failed to convert image to WebP" });
            });
        } else {
          return res
            .status(400)
            .send({ message: "Se debe proporcionar un archivo de imagen." });
        }
      } else if (data.tipo === "Video") {
        if (req.files && req.files.media && req.files.media.path) {
          let video = req.files.media.path;
          let video_path = req.files.media.path.split("\\")[2];
          data.media = video_path;

          // Use Sharp to resize the video and fit (adjust as needed)
          await sharp(video)
            .resize({ width: 640, height: 480, fit: "inside" })
            .videoCodec("libx264")
            .toFile(video_path);

          rutaPost = {
            Bucket: process.env.AWS_BUCKET,
            Key: "posts/" + video_path,
            Body: fs.createReadStream(video_path),
            ACL: "public-read",
          };

          s3.upload(rutaPost, (err, data) => {
            if (err) {
              console.error("Error uploading to S3:", err);
              return res.status(500).json({ error: "Failed to upload to S3" });
            }
            fs.unlinkSync(video_path);
          });
        } else {
          return res
            .status(400)
            .send({ message: "Se debe proporcionar un archivo de video." });
        }
      } else if (data.tipo === "Texto") {
        if (!data.contenido || data.contenido.trim() === "") {
          return res
            .status(400)
            .send({ message: "El campo de texto no puede estar vacío." });
        }
        data.media = data.contenido;
      } else {
        return res
          .status(400)
          .send({ message: "Tipo de publicación no válido." });
      }

      if (data.tipo_p === "Usuario") {
        data.usuario = req.user.sub;
      } else if (data.tipo_p === "Pagina") {
        data.pagina = data.usuario;
      }

      let post = await Post.create(data);

      //notificaciones
      if (data.tipo_p == "Usuario") {
        let amigos = await Usuario_amigo.find({
          usuario_origen: req.user.sub,
          tipo: "Usuario",
        }).populate("usuario_amigo");
        for (var item of amigos) {
          let descripcion =
            req.user.nombres.split(" ")[0] +
            " " +
            req.user.apellidos.split(" ")[0] +
            " ha creado una nueva publicación";
          await Notificacion.create({
            tipo: "publicaciones",
            descripcion: descripcion,
            usuario_interaccion: req.user.sub,
            usuario: item.usuario_amigo._id,
            post: post._id,
          });
        }
        res.status(200).send({ data: post, amigos });
      } else if (data.tipo_p == "Pagina") {
        res.status(200).send({ data: post });
      }
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .send({ data: undefined, message: "No se pudo crear la publicación" });
    }
  } else {
    res.status(403).send({ message: "NoAccess" });
  }
};

const get_post_amigos = async function (req, res) {
  if (req.user) {
    let post = [];
    let data = [];
    let limit = req.params["limit"];
    let filtro = req.params["filtro"];

    // Obtener amigos
    let amigos = await Usuario_amigo.find({
      usuario_origen: req.user.sub,
    }).populate("usuario_amigo");

    let tusPosts;

    if (filtro === "General") {
      // Obtener tus propias publicaciones
      tusPosts = await Post.find({ usuario: req.user.sub })
        .populate("usuario")
        .sort({ createdAt: -1 });
    } else if (filtro === "Imagen") {
      // Obtener tus propias publicaciones
      tusPosts = await Post.find({ usuario: req.user.sub, tipo: "Imagen" })
        .populate("usuario")
        .sort({ createdAt: -1 });
    } else if (filtro === "Texto") {
      // Obtener tus propias publicaciones
      tusPosts = await Post.find({ usuario: req.user.sub, tipo: "Texto" })
        .populate("usuario")
        .sort({ createdAt: -1 });
    } else if (filtro === "Video") {
      // Obtener tus propias publicaciones
      tusPosts = await Post.find({ usuario: req.user.sub, tipo: "Video" })
        .populate("usuario")
        .sort({ createdAt: -1 });
    }

    // Agregar tus propias publicaciones al array de posts
    for (let subitem of tusPosts) {
      let obj_like = await Post_like.findOne({
        usuario: req.user.sub,
        post: subitem._id,
      });
      let reg_likes = await Post_like.find({ post: subitem._id });

      let comentarios = await Post_comment.find({
        post: subitem._id,
        tipo: "comentario",
      }).populate("usuario");

      let arr_comentarios = [];
      for (let replay of comentarios) {
        let respuestas = await Post_comment.find({
          reply_id: replay._id,
          tipo: "respuesta",
        }).populate("usuario");

        arr_comentarios.push({
          comentario: replay,
          respuestas: respuestas,
        });
      }

      post.push({
        post: subitem,
        like: obj_like,
        likes: reg_likes,
        comentarios: arr_comentarios,
      });
    }

    // Agregar las publicaciones de amigos al array de posts
    for (let item of amigos) {
      if (item.usuario_amigo) {
        let postsAmigo;

        if (filtro === "General") {
          // Obtener publicaciones amigos
          postsAmigo = await Post.find({ usuario: item.usuario_amigo._id })
            .populate("usuario")
            .sort({ createdAt: -1 });
        } else if (filtro === "Imagen") {
          // Obtener publicaciones amigos
          postsAmigo = await Post.find({
            usuario: item.usuario_amigo._id,
            tipo: "Imagen",
          })
            .populate("usuario")
            .sort({ createdAt: -1 });
        } else if (filtro === "Texto") {
          // Obtener publicaciones amigos
          postsAmigo = await Post.find({
            usuario: item.usuario_amigo._id,
            tipo: "Texto",
          })
            .populate("usuario")
            .sort({ createdAt: -1 });
        } else if (filtro === "Video") {
          // Obtener publicaciones amigos
          postsAmigo = await Post.find({
            usuario: item.usuario_amigo._id,
            tipo: "Video",
          })
            .populate("usuario")
            .sort({ createdAt: -1 });
        }

        for (let subitem of postsAmigo) {
          let obj_like = await Post_like.findOne({
            usuario: req.user.sub,
            post: subitem._id,
          });
          let reg_likes = await Post_like.find({ post: subitem._id });

          let comentarios = await Post_comment.find({
            post: subitem._id,
            tipo: "comentario",
          }).populate("usuario");

          let arr_comentarios = [];
          for (let replay of comentarios) {
            let respuestas = await Post_comment.find({
              reply_id: replay._id,
              tipo: "respuesta",
            }).populate("usuario");

            arr_comentarios.push({
              comentario: replay,
              respuestas: respuestas,
            });
          }

          post.push({
            post: subitem,
            like: obj_like,
            likes: reg_likes,
            comentarios: arr_comentarios,
          });
        }
      }
    }

    // Obtener tus propias publicaciones
    let paginas = await Usuario_amigo.find({
      usuario_origen: req.user.sub,
      tipo: "Pagina",
    });
    // Agregar las publicaciones de amigos al array de posts
    for (let item of paginas) {
      if (item.usuario_origen) {
        let postsPage;
        if (filtro === "General") {
          postsPage = await Post.find({ pagina: item.usuario_amigo })
            .populate("pagina")
            .sort({ createdAt: -1 });
        } else if (filtro === "Imagen") {
          postsPage = await Post.find({
            pagina: item.usuario_amigo,
            tipo: "Imagen",
          })
            .populate("pagina")
            .sort({ createdAt: -1 });
        } else if (filtro === "Video") {
          postsPage = await Post.find({
            pagina: item.usuario_amigo,
            tipo: "Video",
          })
            .populate("pagina")
            .sort({ createdAt: -1 });
        } else if (filtro === "Texto") {
          postsPage = await Post.find({
            pagina: item.usuario_amigo,
            tipo: "Texto",
          })
            .populate("pagina")
            .sort({ createdAt: -1 });
        }

        for (let subitem of postsPage) {
          let obj_like = await Post_like.findOne({
            usuario: req.user.sub,
            post: subitem._id,
          });
          let reg_likes = await Post_like.find({ post: subitem._id });

          let comentarios = await Post_comment.find({
            post: subitem._id,
            tipo: "comentario",
          }).populate("usuario");

          let arr_comentarios = [];
          for (let replay of comentarios) {
            let respuestas = await Post_comment.find({
              reply_id: replay._id,
              tipo: "respuesta",
            }).populate("usuario");

            arr_comentarios.push({
              comentario: replay,
              respuestas: respuestas,
            });
          }

          post.push({
            post: subitem,
            like: obj_like,
            likes: reg_likes,
            comentarios: arr_comentarios,
          });
        }
      }
    }

    let idx = 0;
    for (var item of post) {
      if (idx < limit) data.push(item);
      idx++;
    }

    res.status(200).send({ data: data });
  } else {
    res.status(403).send({ message: "NoAccess" });
  }
};

const obtener_post_img = async function (req, res) {
  var img = req.params["img"];

  const params = {
    Bucket: process.env.AWS_BUCKET,
    Key: "posts/" + img,
  };

  const url = s3.getSignedUrl("getObject", params);

  res.redirect(url);
};

const set_like_post = async function (req, res) {
  if (req.user) {
    let data = req.body;
    let estado = "";
    let obj_like = await Post_like.find({
      usuario: req.user.sub,
      post: data.post,
    });

    if (obj_like.length >= 1) {
      estado = "eliminación";
      await Post_like.findByIdAndDelete({ _id: obj_like[0]._id });
    } else if (obj_like.length == 0) {
      await Post_like.create({
        post: data.post,
        usuario: req.user.sub,
      });
      estado = "creación";
    }

    res.status(200).send({ data: obj_like });
  } else {
    res.status(403).send({ message: "NoAccess" });
  }
};

const set_comentario_post = async function (req, res) {
  if (req.user) {
    let data = req.body;
    data.usuario = req.user.sub;
    let comentario = await Post_comment.create(data);

    //notificaciones
    let amigos = await Usuario_amigo.find({
      usuario_origen: req.user.sub,
      tipo: "Usuario",
    }).populate("usuario_amigo");
    for (var item of amigos) {
      let descripcion =
        req.user.nombres.split(" ")[0] +
        " " +
        req.user.apellidos.split(" ")[0] +
        " ha realizado un comentario";
      await Notificacion.create({
        tipo: "comentario",
        descripcion: descripcion,
        usuario_interaccion: req.user.sub,
        usuario: item.usuario_amigo._id,
        post: data.post,
      });
    }

    res.status(200).send({ data: comentario, amigos });
  } else {
    res.status(403).send({ message: "NoAccess" });
  }
};

const get_post = async function (req, res) {
  if (req.user) {
    let id = req.params["id"];

    let post = {};
    let post_x = await Post.findById({ _id: id });
    let reg_post;

    let obj_like;
    let reg_likes;
    let arr_comentarios = [];

    if (post_x.tipo_p === "Pagina") {
      reg_post = await Post.findById({ _id: id }).populate("pagina");
      obj_like = await Post_like.findOne({
        usuario: req.user.sub,
        post: reg_post._id,
      });
      reg_likes = await Post_like.find({ post: reg_post._id });

      let comentarios = await Post_comment.find({
        post: reg_post._id,
        tipo: "comentario",
      }).populate("usuario");

      for (var replay of comentarios) {
        let respuestas = await Post_comment.find({
          reply_id: replay._id,
          tipo: "respuesta",
        }).populate("usuario");

        arr_comentarios.push({
          comentario: replay,
          respuestas: respuestas,
        });
      }
    } else if (post_x.tipo_p === "Usuario") {
      reg_post = await Post.findById({ _id: id }).populate("usuario");

      obj_like = await Post_like.findOne({
        usuario: req.user.sub,
        post: reg_post._id,
      });
      reg_likes = await Post_like.find({ post: reg_post._id });

      let comentarios = await Post_comment.find({
        post: reg_post._id,
        tipo: "comentario",
      }).populate("usuario");

      for (var replay of comentarios) {
        let respuestas = await Post_comment.find({
          reply_id: replay._id,
          tipo: "respuesta",
        }).populate("usuario");

        arr_comentarios.push({
          comentario: replay,
          respuestas: respuestas,
        });
      }
    }

    post = {
      post: reg_post,
      like: obj_like,
      likes: reg_likes,
      comentarios: arr_comentarios,
    };

    res.status(200).send({ data: post });
  } else {
    res.status(403).send({ message: "NoAccess" });
  }
};

const delete_post = async function (req, res) {
  if (req.user) {
    let id = req.params["id"];
    const deletedPost = await Post.findByIdAndDelete(id);

    if (deletedPost.tipo === "Imagen" || deletedPost.tipo === "Video") {
      const params = {
        Bucket: process.env.AWS_BUCKET,
        Key: "posts/" + deletedPost.media,
      };

      try {
        const result = await s3.deleteObject(params).promise();
        console.log("Successfully deleted:", result);
        res
          .status(200)
          .send({ message: "Post deleted successfully", data: deletedPost });
      } catch (error) {
        console.error("Error deleting object from S3:", error);
        throw error;
      }
    } else {
      res
        .status(200)
        .send({ message: "Post deleted successfully", data: deletedPost });
    }
  } else {
    res.status(403).send({ message: "NoAccess" });
  }
};

const delete_comentario = async function (req, res) {
  if (req.user) {
    let id = req.params["id"];
    const deletedComentario = await Post_comment.findByIdAndDelete(id);
    if (deletedComentario) {
      res
        .status(200)
        .send({
          message: "Post deleted successfully",
          data: deletedComentario,
        });
    } else {
      res.status(404).send({ message: "Post not found" });
    }
  } else {
    res.status(403).send({ message: "NoAccess" });
  }
};

const get_post_usuario = async function (req, res) {
  if (req.user) {
    try {
      let data = [];
      let username = req.params["username"];
      let limit = req.params["limit"];

      let usuario = await Usuario.findOne({ username: username });

      if (usuario) {
        let posts = await Post.find({ usuario: usuario._id })
          .populate("usuario")
          .sort({ createdAt: -1 });
        let post = [];

        for (var subitem of posts) {
          let obj_like = await Post_like.findOne({
            usuario: usuario._id,
            post: subitem._id,
          });
          let reg_likes = await Post_like.find({ post: subitem._id });

          let comentarios = await Post_comment.find({
            post: subitem._id,
            tipo: "Comentario",
          }).populate("usuario");

          let arr_comentarios = [];
          for (var replay of comentarios) {
            let respuestas = await Post_comment.find({
              reply_id: replay._id,
              tipo: "Respuesta",
            }).populate("usuario");

            arr_comentarios.push({
              comentario: replay,
              respuestas: respuestas,
            });
          }

          post.push({
            post: subitem,
            like: obj_like,
            likes: reg_likes,
            comentarios: arr_comentarios,
          });
        }

        let idx = 0;
        for (var item of post) {
          if (idx < limit) data.push(item);
          idx++;
        }

        res.status(200).send({ data: data });
      } else {
        res.status(200).send({ data: undefined });
      }
    } catch (error) {
      res.status(200).send({ data: undefined });
    }
  } else {
    res.status(403).send({ message: "NoAccess" });
  }
};

const get_imagenes = async function (req, res) {
  if (req.user) {
    let username = req.params["username"];

    let usuario = await Usuario.findOne({ username: username });

    if (usuario) {
      let posts = await Post.find({
        usuario: usuario._id,
        tipo: "Imagen",
      }).sort({ createdAt: -1 });
      res.status(200).send({ data: posts });
    } else {
      res.status(200).send({ data: undefined });
    }
  } else {
    res.status(403).send({ message: "NoAccess" });
  }
};

const get_video = async function (req, res) {
  if (req.user) {
    let username = req.params["username"];

    let usuario = await Usuario.findOne({ username: username });

    if (usuario) {
      let posts = await Post.find({ usuario: usuario._id, tipo: "Video" }).sort(
        { createdAt: -1 }
      );
      res.status(200).send({ data: posts });
    } else {
      res.status(200).send({ data: undefined });
    }
  } else {
    res.status(403).send({ message: "NoAccess" });
  }
};

const get_notificaciones = async function (req, res) {
  if (req.user) {
    let notificaciones = await Notificacion.find({
      usuario: req.user.sub,
      estado: false,
    })
      .limit(10)
      .sort({ createdAt: -1 })
      .populate("usuario_interaccion");
    if (notificaciones.length >= 1) {
      res.status(200).send({ data: notificaciones });
    }
  } else {
    res.status(403).send({ message: "NoAccess" });
  }
};

const set_estado_notificacion = async function (req, res) {
  if (req.user) {
    let id = req.params["id"];
    let notificacion = await Notificacion.findByIdAndUpdate(
      { _id: id },
      {
        estado: true,
      }
    );

    res.status(200).send({ data: notificacion });
  } else {
    res.status(403).send({ message: "NoAccess" });
  }
};

module.exports = {
  create_post,
  get_post_amigos,
  obtener_post_img,
  set_like_post,
  set_comentario_post,
  get_post,
  delete_post,
  get_post_usuario,
  get_imagenes,
  get_video,
  get_notificaciones,
  set_estado_notificacion,
  delete_comentario,
};
