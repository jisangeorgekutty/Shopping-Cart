const { response } = require('express');
var express = require('express');
var router = express.Router();
var productHelper = require('../helper/product-helper');
const userHelper = require('../helper/user-helper');
const { resolve } = require('promise');
const async = require('hbs/lib/async');


/* GET users listing .*/

// const varifyAdminLogin = (req, res, next) => {
//   if (req.session.adminloggedIn) {
//     next()
//   } else {
//     res.redirect('/admin/login')
//   }
// }


router.get('/', function (req, res, next) {
  productHelper.getAllProducts().then((products) => {
    res.render('admin/view-products', { admin: true, products })
  })

});

router.get('/add-products', (req, res) => {
  res.render('admin/add-products', { admin: true });
})

router.post('/add-product', (req, res) => {
  productHelper.addProduct(req.body, (result) => {
    let image = req.files.Image

    image.mv('./public/product-image/' + result + '.jpg', (err, done) => {
      if (!err) {
        res.render('admin/add-products')
      } else {
        console.log('error' + err)
      }
    })

  })

})

router.get('/product-delete/:id', (req, res) => {
  let productId = req.params.id
  productHelper.deleteProducts(productId).then((response) => {
    res.redirect('/admin/')
  })
})

router.get('/product-edit/:id', async (req, res) => {
  let product = await productHelper.getProductDetails(req.params.id)
  res.render('admin/edit-product', { product })
})


router.post('/edit-products/:id', (req, res) => {
  productHelper.updateProduct(req.params.id, req.body).then(() => {
    res.redirect('/admin');
    if (req.files.Image) {
      let image = req.files.Image;
      let result = req.params.id
      image.mv('./public/product-image/' + result + '.jpg');

    }

  })
})

module.exports = router;
