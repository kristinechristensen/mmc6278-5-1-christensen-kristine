const router = require('express').Router()
const app = require('./app')
const db = require('./db')
const PORT = process.env.PORT || 3000;
//Do we need to use teh express.json()function



router
  .route('/inventory')
  // TODO: Create a GET route that returns a list of everything in the inventory table
  // The response should look like:
  // [
  //   {
  //     "id": 1,
  //     "name": "Stratocaster",
  //     "image": "strat.jpg",
  //     "description": "One of the most iconic electric guitars ever made.",
  //     "price": 599.99,
  //     "quantity": 3
  //   },
  //   {...},
  //   {...}, etc
  // ]
  .get(async (req,res) => {
    try {
    const [inventory] = await db.query (`SELECT * FROM inventory`)
    res.json(inventory)
    }
    catch(err) {
      res.status(500).send('There was an error retrieving inventory' + err.message)
    }
  })


  // TODO: Create a POST route that inserts inventory items
  // This route will accept price, quantity, name, image, and description as JSON
  // in the request body.
  // It should return a 204 status code
// Explained in Module 5, video 2 example - this was working and stopped working
 
  .post(async(req, res) => {
    try {
      const {
        name, 
        image,
        description,
        price,
        quantity
      } = req.body
      if (!(
        name &&
        image &&
        description &&
        price &&
        quantity
      ))
      return res
        .status(400)
        .send('Please include all of the following: name, image, description, price, and quantity')
// Ask about bracket / brace usage - confused
    const [newInventory] = await db.query(`
      INSERT INTO inventory (name,image,description,price,quantity)
      VALUES (?,?,?,?,?)
    `,[name,image,description,price,quantity])
    console.log(newInventory)
    res.status(204).end()
    //.status(201).send('Inventory Added') - //KC Question: can you add multiple status?
    
    }
    catch (err) {
      res.status(500).send('Error inserting new inventory' + err.message)
    }
    })




router
  .route('/inventory/:id')
  // TODO: Write a GET route that returns a single item from the inventory
  // that matches the id from the route parameter
  // Should return 404 if no item is found
  // The response should look like:
  // {
  //   "id": 1,
  //   "name": "Stratocaster",
  //   "image": "strat.jpg",
  //   "description": "One of the most iconic electric guitars ever made.",
  //   "price": 599.99,
  //   "quantity": 3
  // }

  // * KC NOTE -Are multiline comments not allowed? *****************************************
  //  I'm not sure how to start this. I don't think the code below is correct. 
  //  I've been testing this in insomnia - it's not working - is it possible to test work in that program
  //  I've tried looking for external examples and nothing that I plug in is working. 
  // Why is this causing an error - a 200 instead of a 404?

  //used cart example below to get this to work - not sure why I needed [[item]] instead of [{item}]
  //ask

  .get(async(req, res) => {
    try {
      const [[item]] = await db.query (`SELECT * FROM inventory WHERE id=?`, [req.params.id])
      
      /* if the item does not exist, then return a 404 */
      if (!item)
        return res.status(404).send('Item not found')
      res.json(item)
    }
    catch(err) {
      res.status(500).send('Error getting the inventory data' + err.message)
    }
  })


  // TODO: Create a PUT route that updates the inventory table based on the id
  // in the route parameter.
  // This route should accept price, quantity, name, description, and image
  // in the request body.
  // If no item is found, return a 404 status.
  // If an item is modified, return a 204 status code.

  .put(async(req, res) => {
    try {
      const {
        name, 
        image,
        description,
        price,
        quantity
      } = req.body
      if (!(
        name &&
        image &&
        description &&
        price &&
        quantity
      ))
      return res
      .status(400)
      .send('Please include all of the following: name, image, description, price, and quantity')

      const [{affectedRows}] = await db.query(
        `UPDATE inventory SET ? WHERE id = ?`,
        [{name, image, description, price, quantity}, [req.params.id]]
      )
      if (affectedRows === 0) {
          return res
            .status(404)
            .send('Inventory not found') 
      }
      else 
          res.status(204).send('The inventory has been updated')
      } 
    catch (err) {
      res.status(500).send('Error updating inventory: ' + err.message)
    }
 })


  // TODO: Create a DELETE route that deletes an item from the inventory table
  // based on the id in the route parameter.
  // If no item is found, return a 404 status.
  // If an item is deleted, return a 204 status code.
  //gathered from example from Module 5 Video 2

  .delete(async(req, res) => {
    try {
      const [{affectedRows}] = await db.query(
        `DELETE FROM inventory WHERE id = ?`,
        req.params.id  
      )
      if (affectedRows === 0) return res
        .status(404)
        .send('Inventory not found')
    res.status(204).send('Inventory deleted')
    } catch(err) {
      res.status(500).send('Error deleting inventory: ' + err.message)
    }
  })






router
  .route('/cart')
  .get(async (req, res) => {
    const [cartItems] = await db.query(
      `SELECT
        cart.id,
        cart.inventory_id AS inventoryId,
        cart.quantity,
        inventory.price,
        inventory.name,
        inventory.image,
        inventory.quantity AS inventoryQuantity
      FROM cart INNER JOIN inventory ON cart.inventory_id=inventory.id`
    )
    const [[{total}]] = await db.query(
      `SELECT SUM(cart.quantity * inventory.price) AS total
       FROM cart, inventory WHERE cart.inventory_id=inventory.id`
    )
    res.json({cartItems, total: total || 0})
  })
  .post(async (req, res) => {
    const {inventoryId, quantity} = req.body
    // Using a LEFT JOIN ensures that we always return an existing
    // inventory item row regardless of whether that item is in the cart.
    const [[item]] = await db.query(
      `SELECT
        inventory.id,
        name,
        price,
        inventory.quantity AS inventoryQuantity,
        cart.id AS cartId
      FROM inventory
      LEFT JOIN cart on cart.inventory_id=inventory.id
      WHERE inventory.id=?;`,
      [inventoryId]
    )
    if (!item) return res.status(404).send('Item not found')
    const {cartId, inventoryQuantity} = item
    if (quantity > inventoryQuantity)
      return res.status(409).send('Not enough inventory')
    if (cartId) {
      await db.query(
        `UPDATE cart SET quantity=quantity+? WHERE inventory_id=?`,
        [quantity, inventoryId]
      )
    } else {
      await db.query(
        `INSERT INTO cart(inventory_id, quantity) VALUES (?,?)`,
        [inventoryId, quantity]
      )
    }
    res.status(204).end()
  })
  .delete(async (req, res) => {
    // Deletes the entire cart table
    await db.query('DELETE FROM cart')
    res.status(204).end()
  })

router
  .route('/cart/:cartId')
  .put(async (req, res) => {
    const {quantity} = req.body
    const [[cartItem]] = await db.query(
      `SELECT
        inventory.quantity as inventoryQuantity
        FROM cart
        INNER JOIN inventory on cart.inventory_id=inventory.id
        WHERE cart.id=?`,
        [req.params.cartId]
    )
    if (!cartItem)
      return res.status(404).send('Not found')
    const {inventoryQuantity} = cartItem
    if (quantity > inventoryQuantity)
      return res.status(409).send('Not enough inventory')
    if (quantity > 0) {
      await db.query(
        `UPDATE cart SET quantity=? WHERE id=?`
        ,[quantity, req.params.cartId]
      )
    } else {
      await db.query(
        `DELETE FROM cart WHERE id=?`,
        [req.params.cartId]
      )
    }
    res.status(204).end()
  })
  .delete(async (req, res) => {
    const [{affectedRows}] = await db.query(
      `DELETE FROM cart WHERE id=?`,
      [req.params.cartId]
    )
    if (affectedRows === 1)
      res.status(204).end()
    else
      res.status(404).send('Cart item not found')
  })

module.exports = router
