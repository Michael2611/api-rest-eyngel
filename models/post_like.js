var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var PostLikeSchema = Schema({
    post: {type: Schema.ObjectId, ref: 'post', required: true},
    usuario: {type: Schema.ObjectId, ref: 'usuario', required: true},
    createdAt: {type: Date, default:Date.now}
});

module.exports = mongoose.model('post_like', PostLikeSchema);