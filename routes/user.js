const { response } = require('express');
var express = require('express');
var router = express.Router();
var productHelper = require('../helper/product-helper')
var userHelper = require('../helper/user-helper');
const async = require('hbs/lib/async');

const varifyLogin = (req, res, next) => {
  if (req.session.loggedIn) {
    next()
  } else {
    res.redirect('/login')
  }
}

/* GET home page. */
router.get('/', async function (req, res, next) {
  let user = req.session.user
  let cartCount = null;
  if (req.session.user) {
    cartCount = await userHelper.getCartCount(req.session.user._id);
  }
  productHelper.getAllProducts().then((products) => {
    res.render('user/view-products', { products, user, cartCount })
  })
});

router.get('/signup', (req, res) => {
  res.render('user/signup')
})


router.get('/login', (req, res) => {
  if (req.session.loggedIn) {
    res.redirect('/')
  } else {
    res.render('user/login', { "loginErr": req.session.loginErr })
    req.session.loginErr = false
  }
})

router.post('/signupaction', (req, res) => {
  userHelper.doSignup(req.body).then((response) => {
    req.session.loggedIn = true
    req.session.user = response
    res.redirect('/')
  })
})

router.post('/loginaction', (req, res) => {
  userHelper.doLogin(req.body).then((response) => {
    if (response.status) {
      req.session.loggedIn = true
      req.session.user = response.user
      res.redirect('/')
    } else {
      req.session.loginErr = true;
      res.redirect('/login')
    }
  })

})

router.get('/logout', (req, res) => {
  req.session.destroy()
  res.redirect('/')
})

router.get('/show-cart', varifyLogin, async (req, res) => {
  let products = await userHelper.getCartProducts(req.session.user._id)
  let total = await userHelper.placeOrder(req.session.user._id)
  res.render('user/cart', { products, user: req.session.user, total })
})

router.get('/add-to-cart/:id', (req, res) => {
  userHelper.addCart(req.params.id, req.session.user._id).then(() => {
    res.json({ status: true })
  })

})

router.post('/change-quantity', (req, res, next) => {
  userHelper.changeProductCount(req.body).then(async (response) => {
    response.total = await userHelper.placeOrder(req.body.user)
    res.json(response)
  })
})

router.post('/remove-product', (req, res, next) => {
  userHelper.removeProduct(req.body).then(() => {
  })
})
module.exports = router;

router.get('/place-order', varifyLogin, async (req, res) => {
  let total = await userHelper.placeOrder(req.session.user._id)
  res.render('user/place-order', { user: req.session.user, total })
})
