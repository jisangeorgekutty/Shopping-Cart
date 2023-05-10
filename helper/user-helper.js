const { resolve, reject } = require('promise')
const collections = require('../config/collections')
var db = require('../config/connection')
var bcrypt = require('bcrypt');
const async = require('hbs/lib/async');
const { response } = require('express');
const { ObjectId } = require('mongodb');
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
        let proObj = {
            item: new ObjectId(productId),
            quantity: 1
        }
        return new Promise(async (resolve, reject) => {
            let userCart = await db.get().collection(collections.CART_COLLECTION).findOne({ user: new objectId(userId) })
            if (userCart) {
                let proExist = userCart.products.findIndex(product => product.item == productId)
                if (proExist != -1) {
                    db.get().collection(collections.CART_COLLECTION).updateOne({ user: new objectId(userId) }, { 'products.item': new objectId(productId) },
                        {
                            $inc: { 'products.$.quantity': 1 }
                        })
                } else {
                    db.get().collection(collections.CART_COLLECTION).updateOne({ user: new objectId(userId) }, {
                        $push: {
                            products: proObj
                        }
                    })
                }
            }
            else {
                let cartObj = {
                    user: new objectId(userId),
                    products: [proObj]
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
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collections.PRODUCT_COLLECION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1,
                        quantity: 1,
                        product: { $arrayElemAt: ['$product', 0] }
                    }
                }
            ]).toArray()
            resolve(cartItems)
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
    },

    changeProductCount: (details) => {
        details.count = parseInt(details.count)
        return new Promise((resolve, reject) => {
            if (details.count == -1 && details.quantity == 1) {
                db.get().collection(collections.CART_COLLECTION).updateOne({ _id: new objectId(details.cart) },
                    {
                        $pull: { products: { item: new objectId(details.product) } }
                    }).then((response) => {
                        resolve({ removeProduct: true })
                    })

            } else {
                db.get().collection(collections.CART_COLLECTION).updateOne({ _id: new objectId(details.cart), 'products.item': new objectId(details.product) },
                    {
                        $inc: { 'products.$.quantity': details.count }
                    }).then((response) => {
                        resolve({ status: true })
                    })
            }
        })
    },

    removeProduct: (details) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collections.CART_COLLECTION).updateOne({ _id: new objectId(details.cart) },
                {
                    $pull: { products: { item: new objectId(details.product) } }
                }).then(() => {

                })
        })
    },

    placeOrder: (userId) => {
        return new Promise(async (resolve, reject) => {
            let total = await db.get().collection(collections.CART_COLLECTION).aggregate([
                {
                    $match: {
                        user: new objectId(userId)
                    }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collections.PRODUCT_COLLECION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1,
                        quantity: 1,
                        product: { $arrayElemAt: ['$product', 0] }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: { $multiply: ['$quantity', { $toInt: '$product.Price' }] } }
                    }
                }
            ]).toArray()
            resolve(total[0].total)
        })
    },
    placeOrderProduct: (order, total, products) => {
        return new Promise((resolve, reject) => {
            console.log(order, total, products)
            let status = order['payment-method'] === 'cod' ? 'placed' : 'pending'
            let orderObj = {
                deliveryDetails: {
                    address: order.address,
                    mobile: order.mobile,
                    pincode: order.pincode
                },
                user: new objectId(order.userId),
                paymentMethod: order['payment-method'],
                status: status,
                totalValue: total,
                products: products,
                date: new Date()
            }

            db.get().collection(collections.ORDER_COLLECTION).insertOne(orderObj).then((response) => {
                db.get().collection(collections.CART_COLLECTION).deleteOne({ user: new objectId(order.userId) })
                resolve()
            })
        })
    },
    getCartProductList: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cart = await db.get().collection(collections.CART_COLLECTION).findOne({ user: new objectId(userId) })
            resolve(cart.products)
        })
    },
    getAllOrderProducts: (userId) => {
        return new Promise(async (resolve, reject) => {
            let products = await db.get().collection(collections.ORDER_COLLECTION).find({ user: new objectId(userId) }).toArray()
            resolve(products)
        })
    }



}