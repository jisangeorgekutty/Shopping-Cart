const { resolve, reject } = require('promise')
const collections = require('../config/collections')
var db = require('../config/connection')
var bcrypt = require('bcrypt');
const async = require('hbs/lib/async');
const { response } = require('express');
var objectId = require('mongodb').ObjectId

module.exports = {
    doSignup: (userData) => {
        return new Promise(async (resolve, reject) => {
            userData.Password = await bcrypt.hash(userData.Password, 10)
            db.get().collection(collections.USER_COLLECTION).insertOne(userData).then((data) => {
                resolve(data.insertedId)
            })
        })
    },

    doLogin: (userData) => {
        return new Promise(async (resolve, reject) => {
            let loginStatus = false;
            let response = {}
            let user = await db.get().collection(collections.USER_COLLECTION).findOne({ Email: userData.Email });
            if (user) {
                bcrypt.compare(userData.Password, user.Password).then((status) => {
                    if (status) {
                        response.user = user;
                        response.status = true;
                        resolve(response);
                    } else {
                        resolve({ status: false })
                    }
                })
            } else {
                resolve({ status: false })
            }
        })
    },

    addCart: (productId, userId) => {
        return new Promise(async (resolve, reject) => {
            let userCart = await db.get().collection(collections.CART_COLLECTION).findOne({ user: new objectId(userId) })

            if (userCart) {
                db.get().collection(collections.CART_COLLECTION).updateOne({ user: new objectId(userId) }, {
                    $push: {
                        products: new objectId(productId)
                    }
                })
            }
            else {
                let cartObj = {
                    user: new objectId(userId),
                    products: [new objectId(productId)]
                }
                db.get().collection(collections.CART_COLLECTION).insertOne(cartObj).then((response) => {
                    resolve()
                })
            }
        })
    },
    getCartProducts: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cartItems = await db.get().collection(collections.CART_COLLECTION).aggregate([
                {
                    $match: {
                        user: new objectId(userId)
                    }
                },
                {
                    $lookup: {
                        from: collections.PRODUCT_COLLECION,
                        let: { prodList: '$products' },
                        pipeline: [{
                            $match: {
                                $expr: {
                                    $in: ['$_id', "$$prodList"]
                                }
                            }
                        }
                        ],
                        as: 'cartItems'
                    }
                }
            ]).toArray()
            resolve(cartItems[0].cartItems)
        })
    },

    getCartCount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let count = 0;
            let cart = await db.get().collection(collections.CART_COLLECTION).findOne({ user: new objectId(userId) })
            if (cart) {
                count = cart.products.length;
            }
            resolve(count)
        })
    }
}