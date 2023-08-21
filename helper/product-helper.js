const { response } = require('express')
const { resolve, reject } = require('promise')
const collections = require('../config/collections')
var db = require('../config/connection')
var objectId = require('mongodb').ObjectId

module.exports = {
    addProduct: (product, callback) => {
        db.get().collection('product').insertOne(product).then((data) => {
            callback(data.insertedId)
        })
    },

    getAllProducts: () => {
        return new Promise(async (resolve, reject) => {
            let products = await db.get().collection(collections.PRODUCT_COLLECION).find().toArray()
            resolve(products)
        })
    },


    deleteProducts: (productId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collections.PRODUCT_COLLECION).deleteOne({ _id: new objectId(productId) }).then((response) => {
                resolve(response)
            })
        })
    },

    getProductDetails: (proId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collections.PRODUCT_COLLECION).findOne({ _id: new objectId(proId) }).then((product) => {
                resolve(product)
            })
        })
    },

    updateProduct: (proId, product) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collections.PRODUCT_COLLECION).updateOne({ _id: new objectId(proId) }, {
                $set: {
                    Name: product.Name,
                    Price: product.Price,
                    Category: product.Category,
                    Description: product.Description
                }
            }).then(() => {
                resolve()
            })
        })
    }



}


