const path = require("path");

// Use the existing order data
const orders = require(path.resolve("src/data/orders-data"));
const dishes = require(path.resolve("src/data/dishes-data"));
const ORDER_STATUSES = ['pending', 'preparing', 'out-for-delivery', 'delivered'];

// Use this function to assign ID's when necessary
const nextId = require("../utils/nextId");

function list(req, res) {
    const { orderId } = req.params;
    res.json({ data: orders.filter(orderId ? order => order.id === orderId : () => true) });
}

function bodyDataHas(propertyName) {
    return function (req, res, next) {
        const { data = {} } = req.body;
        if (data[propertyName]) {
            return next();
        }
        next({
            status: 400,
            message: `Must include a ${propertyName}`
        });
    };
}

function create(req, res) {
    const dishesFromPost = req.body.data.dishes;
    if (!dishesFromPost || !Array.isArray(dishesFromPost) || dishesFromPost.length === 0){
        return res.status(400).json({error: `Order must include a dish`})
    }

    let brokenDish = dishesFromPost.find((dish) => !dish.quantity || typeof dish.quantity !== "number");
    if ( brokenDish !== undefined) {
        return res.status(400).json({error: `Dish ${brokenDish.id} must have a quantity that is an integer greater than 0`})
    }

    const newOrder = {
        id: nextId(),
        deliverTo: req.body.data.deliverTo,
        mobileNumber: req.body.data.mobileNumber,
        status: 'pending',
        dishes: [
            {
                id: req.body.data.dishes[0].id || undefined,
                name: req.body.data.dishes[0].name || undefined,
                description: req.body.data.dishes[0].description || undefined,
                image_url: req.body.data.dishes[0].image_url || undefined,
                price: req.body.data.dishes[0].price || undefined,
                quantity: req.body.data.dishes[0].quantity || undefined
            }
        ],
    };

    if (!req.body.data.deliverTo){
        res.status(400).json({message: `Order must include a deliverTo`})
    }

    if (!req.body.data.mobileNumber){
        res.status(400).json({message: `Order must include a mobileNumber`})
    }

    orders.push(newOrder);
    res.status(201).json({ data: newOrder });
}

function orderExists(req, res, next) {
    const { ordersId } = req.params;
    const foundOrder = orders.find((order) => Number(order.id) === Number(ordersId));
    if (foundOrder) {
        res.locals.order = foundOrder;
        return next();
    }
    next({
        status: 404,
        message: `Order id not found: ${ordersId}`,
    });
}


function read(req, res) {
    res.json({ data: res.locals.order });
}

function update(req, res, next) {
    const reqOrderId = req.body.data.id;
    const paramsOrderId = req.params.ordersId;

    const foundOrder = res.locals.order
    if( reqOrderId && (reqOrderId !== paramsOrderId)) {
        return next(
            {status: 400, message: `Order id ${reqOrderId} does not match ${paramsOrderId}`})
    }

    const {
        data: {
            id,
            deliverTo,
            mobileNumber,
            status,
            dishes,
        } = {}
    } = req.body ;

    if (!req.body.data.dishes || !Array.isArray(req.body.data.dishes) || req.body.data.dishes.length === 0){
        return res.status(400).json({error: `Order must include a dish`})
    }

    let brokenDish = req.body.data.dishes.find((dish) => !dish.quantity || typeof dish.quantity !== "number");
    if ( brokenDish !== undefined) {
        return res.status(400).json({error: `Dish ${brokenDish.id} must have a quantity that is an integer greater than 0`})
    }

    if (!req.body.data.deliverTo){
        return res.status(400).json({error: `Order must include a deliverTo`});
    }

    if (!req.body.data.status || !ORDER_STATUSES.includes(req.body.data.status)){
        return res.status(400).json({error: `Order must have a status of pending, preparing, out-for-delivery, delivered`});
    }

    if (!req.body.data.mobileNumber){
        return res.status(400).json({error: `Order must include a mobileNumber`})
    }

    foundOrder.deliverTo = req.body.data.deliverTo;
    foundOrder.mobileNumber = req.body.data.mobileNumber;
    foundOrder.status = req.body.data.status;


    res.json({ data: foundOrder });

}

function destroy(req, res, next) {
    const { ordersId } = req.params;
    const index = orders.findIndex((order) => order.id === Number(ordersId));
    const foundOrder = res.locals.order
    if (ordersId && foundOrder && (foundOrder.status !== "pending")){
        return next({
            status: 400,
            message: `An order cannot be deleted unless it is pending.`,
        });
    }
    // `splice()` returns an array of the deleted elements, even if it is one element
    const deletedPastes = orders.splice(index, 1);
    res.sendStatus(204);
}

function quantityIsValidNumber(req, res, next){
    const dishes = req.body.data.dishes;

    // Check if dishes is an array and has at least one item
    if (!Array.isArray(dishes) || dishes.length === 0) {
        return next({
            status: 400,
            message: "Invalid dishes data format",
        });
    }

    // Access the first dish object and retrieve the quantity property
    const { quantity } = dishes[0];
    if (quantity <= 0 || !Number.isInteger(quantity)){
        return next({
            status: 400,
            message: `quantity ${quantity} requires a valid number`
        });
    }
    next();
}


module.exports = {
    list,
    create: [
        bodyDataHas("deliverTo"),
        bodyDataHas("mobileNumber"),
        create,
    ],
    read: [
        orderExists,
        read,
    ],
    update: [
        orderExists,
        bodyDataHas("deliverTo"),
        bodyDataHas("mobileNumber"),
        bodyDataHas("deliverTo"),
        bodyDataHas("status"),
        quantityIsValidNumber,
        update,
    ],
    destroy: [
        orderExists,
        destroy,
    ],
}