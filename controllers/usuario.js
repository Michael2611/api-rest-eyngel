var Usuario = require('../models/usuario');
var Usuario_amigo = require('../models/usuario_amigo');
var Pagina = require('../models/pagina');
var usuario_invitacion = require('../models/usuario_invitacion');
var Canal = require('../models/canal');
var bcrypt = require('bcrypt');
const saltRounds = 10;
var jwt = require('../helpers/jwt-simple');
const {uniqueUsernameGenerator} = require('unique-username-generator');
const AWS = require('aws-sdk'); //servicio s3
var sharp = require('sharp');

require('dotenv').config();

var path = require('path');
var fs = require('fs');
var handlebars = require('handlebars');
var ejs = require('ejs');
var nodemailer = require('nodemailer');
var smtp = require('nodemailer-smtp-transport');
const usuario_amigo = require('../models/usuario_amigo');


AWS.config.update({
    secretAccessKey: process.env.AWS_KEY_ID,
    accessKeyId: process.env.AWS_KEY_ACCESS,
    region: process.env.AWS_REGION, // Ejemplo: 'us-east-1'
});

const s3 = new AWS.S3();

const create_usuario = async function(req, res){
    let data = req.body;

    try {

        let usuarios = await Usuario.find({email:data.email});

        if(usuarios.length == 0){
    
            let usersnames = [data.nombres+ '' +data.apellidos];
            //usersnames.push(data.nombres+''+data.apellidos);
    
            const config = {
                dictionaries: [usersnames],
                separator: '',
                style: 'capital',
                randomDigits: 3
            }
    
            bcrypt.genSalt(saltRounds, function(err, salt) {
                bcrypt.hash(data.password, salt, async function(err, hash) {
                    data.password = hash;
                    data.username = '@'+uniqueUsernameGenerator(config); 
                    let usuario = await Usuario.create(data);
                    res.status(200).send({data:usuario});                    
                });
            });
    
        }else{
            res.status(200).send({data:undefined, message: 'El correo electronico ya existe'});
        }  
        
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: 'Error en el servidor' });
    }
}

const login_usuario = async function(req, res){
    let data = req.body;
    

    let usuario = await Usuario.find({email:data.email});
    if(usuario.length>=1){

        bcrypt.compare(data.password, usuario[0].password, function(err, result) {
            if(!err){
                if(result){
                    res.status(200).send({data:usuario[0], token: jwt.createToken(usuario[0])});
                }else{
                    res.status(200).send({data:undefined, message: 'La contraseña es incorrecta'});
                }
            }else{
                res.status(200).send({data:undefined, message: 'Ocurrió un problema'});
            }
        });
    }else{
        res.status(200).send({data:undefined, message: 'El correo electronico no existe'});
    }
}

const get_usuario = async function(req, res){
    if(req.user){
        var id = req.params['id'];

        var usuario = await Usuario.findById({_id:id});
        res.status(200).send({data:usuario});
    }else{
        res.status(403).send({message: 'NoAccess'});
    }
}

const update_usuario = async function(req, res){
    if(req.user){
        var id = req.params['id'];
        var data = req.body;
        
        var usuario = await Usuario.findByIdAndUpdate({_id:id},{
            nombres: data.nombres,
            apellidos: data.apellidos,
            genero: data.genero,
            nacimiento: data.nacimiento,
            profesion: data.profesion,
            telefono: data.telefono,
            descripcion: data.descripcion,
        });

        res.status(200).send({data:usuario});
    }else{
        res.status(403).send({message: 'NoAccess'});
    }
}

const update_password = async function(req, res){
    if(req.user){
        var id = req.params['id'];
        var data = req.body;

        var usuario = await Usuario.findById({_id:id});

        bcrypt.compare(data.password_actual, usuario.password, function(err, result) {
            if(!err){
                if(result){
                    bcrypt.genSalt(saltRounds, function(err, salt) {
                        bcrypt.hash(data.password_nueva, salt, async function(err, hash) {
                            await Usuario.findByIdAndUpdate({_id:id},{
                                password: hash
                            });
                            res.status(200).send({data:usuario});
                        });
                    });
                }else{
                    res.status(200).send({data:undefined, message: 'La contraseña actual es incorrecta'});
                }
            }else{
                res.status(200).send({data:undefined, message: 'Ocurrió un problema'});
            }
        });
    }else{
        res.status(403).send({message: 'NoAccess'});
    }
}

const validate_usuario = async function(req, res){
    var data = req.body;

    var usuarios = await Usuario.find({email:data.email});

    if(usuarios.length >= 1){

        let min = 1000;
        let max = 9999;

        let random = Math.floor(Math.random()*(max-min+1)+min);
        let usuario = await Usuario.findByIdAndUpdate({_id:usuarios[0]._id},{
            code_reset: random
        });

        email_code_reset(random, usuario.email);

        res.status(200).send({data:true});
    }else{
        res.status(200).send({data:false});
    }

}

function email_code_reset(code,email){
    try {
        var readHTML = function(path, callback){
            fs.readFile(path, {encoding: 'utf-8'}, function(err, html) {
                if(!err){
                    callback(null, html);
                }
            })
        }
    
        var transport = nodemailer.createTransport(smtp({
            service: 'gmail',
            host: 'smtp.gmail.com',
            auth: {
                user: 'maicolr62@gmail.com',
                pass: 'gdwlcioenikjwriy'
            }
        }));
    
        readHTML(process.cwd()+'/emails/code-password.html', async(err, html)=>{
            let res_html = ejs.render(html, {code:code});
            var template = handlebars.compile(res_html);
            var htmlToSend = template({op:true});
    
            var mailOptions = {
                from: '"Eyngel" <maicolr62@gmail.com>',
                to: email,
                subject: 'Código de restablecimiento',
                html: htmlToSend
            };
    
            transport.sendMail(mailOptions, async function(err, info){
                if(err){
                    console.log(err);
                }else{
                    console.log(info);
                }
            })
    
        })
    } catch (error) {
        console.log(error);
    }
}

const validate_code = async function(req, res){
    let code = req.params['code'];
    let email = req.params['email'];

    let usuario = await Usuario.findOne({email:email});

    if(code == usuario.code_reset){
        res.status(200).send({data:true});
    }else{
        res.status(200).send({data:false});
    }

}

const reset_password = async function(req, res){
    var email = req.params['email'];
        var data = req.body;

        var usuario = await Usuario.findOne({email:email});

        bcrypt.genSalt(saltRounds, function(err, salt) {
            bcrypt.hash(data.password_new, salt, async function(err, hash) {
                await Usuario.findByIdAndUpdate({_id:usuario._id},{
                    password: hash
                });
                res.status(200).send({data:usuario});
            });
        });
}

const send_invitacion_amistad = async function(req, res){
    if(req.user){

        let data = req.body;
        data.usuario_origen = req.user.sub;

        let solicitud_existe = await usuario_invitacion.findOne({usuario_origen:data.usuario_origen, usuario_destinatario:data.usuario_destinatario});

        if(!solicitud_existe){
            let invitacion = await usuario_invitacion.create(data);
            res.status(200).send({data:invitacion});
        }

    }else{
        res.status(403).send({message: 'No Access'});
    }
}

const get_usuarios_random = async function(req, res){
    if(req.user){
        let data = [];
        let usuarios = await Usuario.find({_id:{$ne:req.user.sub}});

        let invitaciones_enviadas = await usuario_invitacion.find({usuario_origen:req.user.sub});
        let invitaciones_recibidas = await usuario_invitacion.find({usuario_destinatario:req.user.sub});
        let usuarios_amigos = await usuario_amigo.find({usuario_origen:req.user.sub});

        let count = 0;
        for(var item of usuarios){
            let reg_enviadas = invitaciones_enviadas.filter(subitem=> subitem.usuario_destinatario.toString() == item._id.toString());
            let reg_recibidas = invitaciones_recibidas.filter(subitem=> subitem.usuario_origen.toString() == item._id.toString());
            let amigos = usuarios_amigos.filter(subitem=> subitem.usuario_amigo.toString() == item._id.toString());
            if(count<=4){
                if(reg_enviadas.length == 0){
                    if(reg_recibidas.length == 0){
                        if(amigos.length == 0){
                            count++;
                            data.push(item);
                        }
                    }
                }
            }
        }
        res.status(200).send({data:data});
    }else{
        res.status(403).send({message: 'No Access'});
    }
}

const get_invitaciones_usuario = async function(req, res){
    if(req.user){
        let tipo = req.params['tipo'];
        if(tipo == 'Limite'){
        let invitaciones = await usuario_invitacion.find({usuario_destinatario:req.user.sub}).populate('usuario_origen').limit(5).sort({createAt:-1});
        if(invitaciones.length>=1){
            res.status(200).send({data:invitaciones});
        }
        }else if(tipo == 'Completo'){
            let invitaciones = await usuario_invitacion.find({usuario_destinatario:req.user.sub}).populate('usuario_origen').sort({createAt:-1});;
            if(invitaciones.length>=1){
                res.status(200).send({data:invitaciones});
            }
        }
        
    }else{
        res.status(403).send({message: 'No Access'});
    }
}

const aceptar_declinar_invitacion = async function(req, res){
    if(req.user){
        let tipo = req.params['tipo'];
        let id = req.params['id'];
        if(tipo == 'Declinar'){
            await usuario_invitacion.findOneAndDelete({_id:id}); //eliminar invitación
            res.status(200).send({data:true});
        }else if(tipo == 'Aceptar'){

            let invitacion = await usuario_invitacion.findById({_id:id}); //obtener invitación

            //crear amigo
            await usuario_amigo.create({
                usuario_origen: req.user.sub,
                usuario_amigo: invitacion.usuario_origen,
                tipo: 'Usuario'
            });

            //
            await usuario_amigo.create({
                usuario_origen: invitacion.usuario_origen,
                usuario_amigo: req.user.sub,
                tipo: 'Usuario'
            });

            await usuario_invitacion.findOneAndDelete({_id:id});
            res.status(200).send({data:true});
        }
    }else{
        res.status(403).send({message: 'No Access'});
    }
}

const obtener_usuarios = async function(req, res){
    if(req.user){
        let filtro = req.params['filtro'];

        var usuario = await Usuario.findById({_id:req.user.sub});

        var usuarios = await Usuario.find({
            $or: [
                {nombres: new RegExp(filtro,'i')},
                {apellidos: new RegExp(filtro,'i')},
            ],_id:{$ne:req.user.sub}
        });

        var amigos = await Usuario_amigo.find({usuario_origen:usuario._id});

        usuarios = usuarios.map(user =>{
            user.esAmigo = amigos.some(amigo => amigo.usuario_amigo.equals(user._id));
            return user;
        });

        //busqueda paginas

        var paginas = await Pagina.find({
            $or: [
                {nombre_pag: new RegExp(filtro,'i')},
            ]
        });

        //busqueda canales

        var canales = await Canal.find({
            $or: [
                {nombre_canal: new RegExp(filtro,'i')},
            ]
        });

        res.status(200).send({data:usuarios, amigos, paginas, canales});

    }else{
        res.status(403).send({message: 'No Access'});
    }
}

const obtener_usuarios_username = async function(req, res){
    if(req.user){
        let username = req.params['username'];

        var usuario = await Usuario.findById({_id:req.user.sub}); //sesión
        
        var usuarios = await Usuario.find({username: username});
        for(var item of usuarios){
            if(usuarios.length>=1){
                var amigos = await Usuario_amigo.find({usuario_origen:item._id, tipo: 'Usuario'}).populate('usuario_amigo');
                usuarios = usuarios.map(user =>{
                    user.esAmigo = amigos.some(amigo => amigo.usuario_amigo.equals(user._id));
                    return user;
                });
                res.status(200).send({data:usuarios[0], namigos:amigos.length, amigos:amigos});
            }else{
                res.status(200).send({data:undefined});
            }
        }
        
    }else{
        res.status(403).send({message: 'No Access'});
    }
}

const actualizar_portada_usuario = async function(req, res){
    if(req.user){
        
        var img = req.files.portada.path;

        // Use Sharp to resize and fit the image
        const resizedImageBuffer = await sharp(img).resize({ width: 800, height: 600, fit: 'inside' }).toBuffer();

        const rutaPortada = {
            Bucket: process.env.AWS_BUCKET,
            Key: "portadas/"+img.split('\\')[2],//ruta imagen,
            Body: resizedImageBuffer,
            ACL: 'public-read', // Permite que los archivos sean públicos
        }

        s3.upload(rutaPortada, (err, data) => {
            if (err) {
                console.error('Error uploading to S3:', err);
                return res.status(500).json({ error: 'Failed to upload to S3' });
            }
            fs.unlinkSync(img);
        });
        
        var usuario = await Usuario.findByIdAndUpdate({_id:req.user.sub},
        {
            portada: img.split('\\')[2]
        });
        res.status(200).send({data:usuario});
    }else{
        res.status(403).send({message: 'No Access'});
    }
}

const actualizar_avatar_usuario = async function(req, res){
    if(req.user){

        var img = req.files.avatar.path;

        const rutaAvatar = {
            Bucket: process.env.AWS_BUCKET,
            Key: "avatar/"+img.split('\\')[2],//ruta imagen,
            Body: fs.createReadStream(img),
            ACL: 'public-read', // Permite que los archivos sean públicos
        }

        s3.upload(rutaAvatar, (err, data) => {
            if (err) {
                console.error('Error uploading to S3:', err);
                return res.status(500).json({ error: 'Failed to upload to S3' });
            }
            fs.unlinkSync(img);
        })

        var usuario = await Usuario.findByIdAndUpdate({_id:req.user.sub},
            {
                avatar: img.split('\\')[2]
            });
            res.status(200).send({data:usuario});
    }else{
        res.status(403).send({message: 'No Access'});
    }
}

const obtener_portada_img = async function(req, res){
    var img = req.params['img'];

    const params = {
        Bucket: process.env.AWS_BUCKET,
        Key: "portadas/"+img,
    }

    const url = s3.getSignedUrl('getObject', params);

    res.redirect(url);

    //mostrar imagen de manera local
    /*fs.stat('./uploads/portadas/'+img, function(err){
        if(err){
            res.status(200).send({message: 'No se encontro la imagen'});
        }else{
            let path_img = './uploads/portadas/'+img;
            res.status(200).sendFile(path.resolve(path_img));
        }
    });*/

}

const obtener_avatar_img = async function(req, res){
    var img = req.params['img'];

    const params = {
        Bucket: process.env.AWS_BUCKET,
        Key: "avatar/"+img,
    }

    const url = s3.getSignedUrl('getObject', params);

    res.redirect(url);
}

module.exports = {
    create_usuario,
    login_usuario,
    get_usuario,
    update_usuario,
    update_password,
    validate_usuario,
    validate_code,
    reset_password,
    obtener_usuarios_username,
    actualizar_portada_usuario,
    actualizar_avatar_usuario,
    
    send_invitacion_amistad,
    get_usuarios_random,
    get_invitaciones_usuario,
    aceptar_declinar_invitacion,
    obtener_usuarios,
    obtener_portada_img,
    obtener_avatar_img
}