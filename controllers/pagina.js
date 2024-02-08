var Pagina = require('../models/pagina');
var Usuario = require('../models/usuario');
var usuario_amigo = require('../models/usuario_amigo');
var Post = require('../models/post');
var Post_like = require('../models/post_like');
var Post_comment = require('../models/post_comments');
var path = require('path');
var fs = require('fs');
var sharp = require('sharp');

const AWS = require('aws-sdk'); //servicio s3

AWS.config.update({
    secretAccessKey: process.env.AWS_KEY_ID,
    accessKeyId: process.env.AWS_KEY_ACCESS,
    region: process.env.AWS_REGION, // Ejemplo: 'us-east-1'
});

const s3 = new AWS.S3();

const create_pagina = async function(req, res){
    let data = req.body;
    try {
        data.usuario_pag = req.user.sub;
        let pagina = await Pagina.create(data);
        res.status(200).send({data:pagina});
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: 'Error en el servidor' });
    }
}

const get_paginas_usuario = async function(req, res){
    if(req.user){
        let data = [];
        var usuario = await Usuario.findById({_id:req.user.sub});
        if(usuario){
            let paginas = await Pagina.find({usuario_pag: usuario._id});
            for(let item of paginas){
                data.push(item);
            }
            res.status(200).send({data:data});
        }
    }else{
        res.status(403).send({message: 'No Access'});
    }
}

const pagina_usuario = async function(req,res){
    if(req.user){
        let seguidosx = [];
        var id = req.params['id'];
        
        var pagina = await Pagina.findById({_id:id});
        let sigue_pagina = await usuario_amigo.find({usuario_origen: req.user.sub, usuario_amigo:id});

        if(pagina){
            var seguido = await usuario_amigo.find({usuario_amigo:id, usuario_origen:req.user.sub});
            var seguidos = await usuario_amigo.find({usuario_amigo: id, tipo: 'Pagina'});   
            for(item of seguidos){
                var usuario = await Usuario.find({_id: item.usuario_origen});
                seguidosx.push(usuario);
            }
            res.status(200).send({data:pagina, seguidos:seguidosx, sigue:sigue_pagina});
        }
    }else{
        res.status(403).send({message: 'No Access'});
    }
}

const actualizar_avatar_pagina = async function(req, res){
    if(req.user){
        var id = req.params['id'];

        var img = req.files.avatar_pag.path;
        const imageNameWithoutExtension = path.parse(img).name;
        const webpImg = imageNameWithoutExtension + '.webp';
        
        sharp(img)
            .webp()
            .toFile(webpImg, (err, info) => {
                if(err){
                        console.error('Error al convertir la imagen a WebP:', err);
                        return res.status(500).json({ error: 'Failed to convert image to WebP' });
                    }
                    //fs.unlinkSync(img);

                    const rutaPagina = {
                        Bucket: process.env.AWS_BUCKET,
                        Key: "avatar/"+webpImg,//ruta imagen,
                        Body: fs.createReadStream(webpImg),
                        ACL: 'public-read', // Permite que los archivos sean públicos
                    }

                    s3.upload(rutaPagina, (err, data) => {
                        if (err) {
                            console.error('Error uploading to S3:', err);
                            return res.status(500).json({ error: 'Failed to upload to S3' });
                        }
                        fs.unlinkSync(img);
                    });
                })
        var pagina = await Pagina.findByIdAndUpdate({_id:id},
            {
                avatar_pag: webpImg
            });
        res.status(200).send({data:pagina});
    }else{
        res.status(403).send({message: 'No Access'});
    }
}

const obtener_avatar_img_pagina = async function(req, res){
    var img = req.params['img'];

    const params = {
        Bucket: process.env.AWS_BUCKET,
        Key: "avatar/"+img,
    }

    const url = s3.getSignedUrl('getObject', params);
    
    res.redirect(url);
}

const actualizar_portada_pagina = async function(req, res){
    if(req.user){
        var id = req.params['id'];

        var img = req.files.portada_pag.path;
        const imageNameWithoutExtension = path.parse(img).name;
        const webpImg = imageNameWithoutExtension + '.webp';

        sharp(img)
                .webp()
                .toFile(webpImg, (err, info) => {
                    if(err){
                        console.error('Error al convertir la imagen a WebP:', err);
                        return res.status(500).json({ error: 'Failed to convert image to WebP' });
                    }
                    //fs.unlinkSync(img);

                    const rutaPagina = {
                        Bucket: process.env.AWS_BUCKET,
                        Key: "portadas/"+webpImg,//ruta imagen,
                        Body: fs.createReadStream(img),
                        ACL: 'public-read', // Permite que los archivos sean públicos
                    }
            
                    s3.upload(rutaPagina, (err, data) => {
                        if (err) {
                            console.error('Error uploading to S3:', err);
                            return res.status(500).json({ error: 'Failed to upload to S3' });
                        }
                        fs.unlinkSync(img);
                    });


                })

        

        var pagina = await Pagina.findByIdAndUpdate({_id:id},
            {
                portada_pag: webpImg
            });
        res.status(200).send({data:pagina});
    }else{
        res.status(403).send({message: 'No Access'});
    }
}

const obtener_portada_img_pagina = async function(req, res){
    var img = req.params['img'];
    const params = {
        Bucket: process.env.AWS_BUCKET,
        Key: "portadas/"+img,
    }

    const url = s3.getSignedUrl('getObject', params);
    
    res.redirect(url);
}

const seguir_pagina = async function(req, res){
    if(req.user){
        let tipo = req.params['tipo'];
        let id = req.params['id'];

        let verificar_seguimiento = await usuario_amigo.find({usuario_origen:req.user.sub, usuario_amigo: id});

        if(verificar_seguimiento.length>=1){
            if(tipo == 'Declinar'){
                await usuario_amigo.findOneAndDelete({usuario_origen:req.user.sub, usuario_amigo:id}); //eliminar invitación           
                res.status(200).send({data:true});
            }
        }else{
            if(tipo == 'Aceptar'){
                await usuario_amigo.create({
                    usuario_origen: req.user.sub,
                    usuario_amigo: id,
                    tipo: 'Pagina'
                });            
                res.status(200).send({data:true});
            }
        }

        
    }else{
        res.status(403).send({message: 'No Access'});
    }
}

const get_post_pagina = async function(req,res){
    if (req.user) {
        try {
            let id = req.params['id'];

        let pagina = await Pagina.findById({_id:id});
        let post = [];
        let data = [];

        if(pagina){

            let posts = await Post.find({usuario:pagina._id}).populate('pagina').sort({createdAt:-1});
            
            // Agregar tus propias publicaciones al array de posts
            for (let subitem of posts) {
                
                let obj_like = await Post_like.findOne({usuario: req.user.sub, post: subitem._id});
                let reg_likes = await Post_like.find({post: subitem._id});
                
                let comentarios = await Post_comment.find({post: subitem._id, tipo: 'comentario'}).populate('usuario');
                
                let arr_comentarios = [];
                for(let replay of comentarios){
                    let respuestas = await Post_comment.find({reply_id: replay._id, tipo: 'respuesta'}).populate('usuario');
                    
                    arr_comentarios.push({
                        comentario: replay,
                        respuestas: respuestas
                    });
                }
                
                post.push({
                    post: subitem,
                    like: obj_like,
                    likes: reg_likes,
                    comentarios: arr_comentarios
                });
            }

            for(var item of post){
                data.push(item);
            }


            res.status(200).send({data:data});
        }else{
            res.status(200).send({data:undefined});
        }
        } catch (error) {
            res.status(200).send({data:undefined});
        }
    } else {
        res.status(403).send({message: 'NoAccess'}); 
    }
}

const delete_pagina = async function(req, res){
    if(req.user){
        let id = req.params['id'];
        const deletedPagina = await Pagina.findByIdAndDelete(id);
        if(deletedPagina){
            res.status(200).send({ message: 'Post deleted successfully', data: deletedPagina });
        }else{
            res.status(404).send({ message: 'Post not found' });
        }
    }else{
        res.status(403).send({message: 'NoAccess'});
    }
}

module.exports = {
    create_pagina,
    get_paginas_usuario,
    pagina_usuario,
    actualizar_avatar_pagina,
    obtener_avatar_img_pagina,
    actualizar_portada_pagina,
    obtener_portada_img_pagina,
    seguir_pagina,
    get_post_pagina,
    delete_pagina
}