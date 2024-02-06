var Canal = require('../models/canal');
var Canal_chat = require('../models/canal_chat');
var usuario_amigo = require('../models/usuario_amigo');
var path = require('path');
var fs = require('fs');

const AWS = require('aws-sdk'); //servicio s3

AWS.config.update({
    secretAccessKey: process.env.AWS_KEY_ID,
    accessKeyId: process.env.AWS_KEY_ACCESS,
    region: process.env.AWS_REGION, // Ejemplo: 'us-east-1'
});

const s3 = new AWS.S3();

const create_canal = async function(req, res){
    let data = req.body;
    try {
        data.usuario_canal = req.user.sub;

        if (req.files && req.files.avatar_canal && req.files.avatar_canal.path) {
            let img = req.files.avatar_canal.path;
            let image_path = req.files.avatar_canal.path.split('\\')[3];
            data.avatar_canal = image_path;

            const rutaAvatarCanal = {
                Bucket: process.env.AWS_BUCKET,
                Key: "canales/avatar/"+img.split('\\')[3],//ruta imagen,
                Body: fs.createReadStream(img),
                ACL: 'public-read', // Permite que los archivos sean públicos
            }

            s3.upload(rutaAvatarCanal, (err, data) => {
                if (err) {
                    console.error('Error uploading to S3:', err);
                    return res.status(500).json({ error: 'Failed to upload to S3' });
                }
                fs.unlinkSync(img);
            });

        }

        let canal = await Canal.create(data);
        res.status(200).send({data:canal});
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: 'Error en el servidor' });
    }
}

const get_canales = async function (req, res) {
    if (req.user) {
        try {

            // Obtener los canales creados por el usuario
            let canalesUsuario = await Canal.find({ usuario_canal: req.user.sub });

            // Obtener los amigos del usuario
            let amigos = await usuario_amigo.find({ usuario_origen: req.user.sub });

            // Obtener canales verificados
            let canales_verificados = await Canal.find({verified_canal: true});

            //obtener canales populares
            let canales_general = await Canal.find();
            if(canales_general.length>=1){
                let canales_populares;
            for(var i of canales_general){
                i.canales_populares = await usuario_amigo.countDocuments({usuario_amigo: i._id, tipo: 'Canal'});
            }   

            canales_general.sort((a,b) => b.canales_populares - a.canales_populares);

            const populares = canales_general.slice(0,3);

            // Obtener los canales de los amigos
            let canalesAmigos = [];
            for (var item of amigos) {
                let canalesAmigo = await Canal.find({ usuario_canal: item.usuario_amigo });
                canalesAmigos = canalesAmigos.concat(canalesAmigo);
            }

            // Combinar los canales del usuario y los canales de sus amigos
            let todosLosCanales = [...canalesUsuario, ...canalesAmigos];

            // Eliminar duplicados (opcional)
            todosLosCanales = Array.from(new Set(todosLosCanales.map((canal) => canal._id)))
                .map((id) => todosLosCanales.find((canal) => canal._id === id));

            // Mapear los canales y obtener la cantidad de seguidores para cada uno
            const canalesConSeguidores = await Promise.all(
                todosLosCanales.map(async (canal) => {
                    // Obtener la cantidad de seguidores para el canal desde el modelo usuario_amigo
                    const seguidoresCount = await usuario_amigo.countDocuments({ usuario_amigo: canal._id });
                    
                    // Agregar la información de seguidores al objeto canal
                    const canalConSeguidores = canal.toObject(); // Convertir a objeto para poder agregar propiedades
                    canalConSeguidores.seguidores = seguidoresCount;
                    return canalConSeguidores;
                })
            );
            res.status(200).send({ data: canalesConSeguidores, verificados: canales_verificados, populares: populares });
            }
            
        } catch (error) {
            console.error(error);
            res.status(500).send({ message: 'Internal Server Error' });
        }
    } else {
        res.status(403).send({ message: 'No Access' });
    }
};

const obtener_avatar_canal = async function(req, res){
    var img = req.params['img'];
    
    const params = {
        Bucket: process.env.AWS_BUCKET,
        Key: "canales/avatar/"+img,
    }

    const url = s3.getSignedUrl('getObject', params);

    res.redirect(url);

}

const get_canal = async function(req, res){
    if(req.user){
        let id = req.params['id'];

        let canal = await Canal.findById({_id:id});

        let seguidores = await usuario_amigo.find({usuario_amigo: id}).populate('usuario_origen');
        let sigue_canal = await usuario_amigo.find({usuario_origen: req.user.sub, usuario_amigo:id});
        
        //cuando cree el modelo de seguimiento agregar los usuarios que siguen este canal
        if(canal){
            res.status(200).send({data:canal, sigue:sigue_canal, seguidores:seguidores});
        }
    }else{
        res.status(403).send({message: 'No Access'});
    }
}

const seguir_canal = async function(req, res){
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
                    tipo: 'Canal'
                });            
                res.status(200).send({data:true});
            }
        } 
    }else{
        res.status(403).send({message: 'No Access'});
    }
}

const delete_canal = async function(req, res){
    if(req.user){
        let id = req.params['id'];
        const deletedCanal = await Canal.findByIdAndDelete(id);
        if(deletedCanal){
            res.status(200).send({ message: 'Post deleted successfully', data: deletedCanal });
        }else{
            res.status(404).send({ message: 'Post not found' });
        }
    }else{
        res.status(403).send({message: 'NoAccess'});
    }
}

const create_chat_canal = async function(req, res){
    let data = req.body;
    try {
        data.usuario = req.user.sub;
        if (req.files && req.files.media && req.files.media.path) {
            let img = req.files.media.path;
            let image_path = req.files.media.path.split('\\')[3];
            data.media = image_path;

            const rutaAvatarChat = {
                Bucket: process.env.AWS_BUCKET,
                Key: "canales/chat/"+img.split('\\')[3],//ruta imagen,
                Body: fs.createReadStream(img),
                ACL: 'public-read', // Permite que los archivos sean públicos
            }

            s3.upload(rutaAvatarChat, (err, data) => {
                if (err) {
                    console.error('Error uploading to S3:', err);
                    return res.status(500).json({ error: 'Failed to upload to S3' });
                }
                fs.unlinkSync(img);
            });

        }

        let canal_chat = await Canal_chat.create(data);
        res.status(200).send({data:canal_chat});
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: 'Error en el servidor' });
    }
}

const get_chat_canal = async function(req, res){
    if(req.user){
        let id = req.params['id'];
        let chat_canal = await Canal_chat.find({canal:id}).populate('usuario');    
        let canal = await Canal.findById({_id:id});   
        let sigue_canal = await usuario_amigo.find({usuario_origen: req.user.sub, usuario_amigo:id});
        //cuando cree el modelo de seguimiento agregar los usuarios que siguen este canal
        if(chat_canal){
            res.status(200).send({data:chat_canal, sigue:sigue_canal, canal: canal});
        }
    }else{
        res.status(403).send({message: 'No Access'});
    }
}

const obtener_chat_img = async function(req, res){
    var img = req.params['img'];
    const params = {
        Bucket: process.env.AWS_BUCKET,
        Key: "canales/chat/"+img,
    }

    const url = s3.getSignedUrl('getObject', params);

    res.redirect(url);
}

const vaciar_canal = async function(req, res){
    if(req.user){
        let id = req.params['id'];
        const messages_canal = await Canal_chat.find({canal: id});
        if(messages_canal.length>=1){
            for(var item of messages_canal){
                const imagePath = path.join(__dirname, '../uploads/canales/chat/'+item.media);
                    fs.unlink(imagePath, (err)=>{
                        if(err){
                            console.error(`Error al eliminar la imagen: ${err}`);
                        }
                     });
            }
            const d_messages_canal = await Canal_chat.deleteMany({canal: id});
            res.status(200).send({ message: 'Post deleted successfully', data: d_messages_canal });
        }else{
            res.status(404).send({ message: 'Post not found' });
        }
    }else{
        res.status(403).send({message: 'NoAccess'});
    }
}

const delete_message = async function(req, res){
    if(req.user){
        let id = req.params['id'];
        const deletedMessage = await Canal_chat.findByIdAndDelete(id);
        if(deletedMessage){
            res.status(200).send({ message: 'Post deleted successfully', data: deletedMessage });
        }else{
            res.status(404).send({ message: 'Post not found' });
        }
    }else{
        res.status(403).send({message: 'NoAccess'});
    }
}

const update_canal = async function(req, res){
    if(req.user){
        var id = req.params['id'];
        var data = req.body;

        var canal = await Canal.findByIdAndUpdate({_id:id},{
            nombre_canal: data.nombre_canal,
            descripcion_canal: data.descripcion_canal,
            avatar_canal: data.avatar_canal,
        });

        res.status(200).send({data:canal});
    }else{
        res.status(403).send({message: 'NoAccess'});
    }
}

module.exports = {
  create_canal,
  get_canales,
  obtener_avatar_canal,
  get_canal,
  seguir_canal,
  delete_canal,
  create_chat_canal,
  get_chat_canal,
  obtener_chat_img,
  vaciar_canal,
  delete_message,
  update_canal
}