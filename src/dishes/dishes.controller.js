const path = require("path");

// Use the existing dishes data
const dishes = require(path.resolve("src/data/dishes-data"));

// Use this function to assign ID's when necessary
const nextId = require("../utils/nextId");


function list(req, res) {
    const { dishId } = req.params;
    res.json({ data: dishes.filter(dishId ? dish => dish.id === dishId : () => true) });
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

function priceIsValidNumber(req, res, next){
    const { data: { price }  = {} } = req.body;
    if (price <= 0 || !Number.isInteger(price)){
        return next({
            status: 400,
            message: `price requires a valid number`
        });
    }
    next();
}



function create(req, res) {
    const { data: { name, description, price, image_url } = {} } = req.body;
    const newDish = {
        id: nextId(), // Increment last id then assign as the current ID
        name: name,
        description: description,
        price: price,
        image_url: image_url,
    };
    dishes.push(newDish);
    res.status(201).json({ data: newDish });
}

function dishExists(req, res, next) {

    const { dishId } = req.params;
    const foundDish = dishes.find((dish) => Number(dish.id) === Number(dishId));
    if (foundDish) {
        res.locals.dish = foundDish;
        return next();
    }
    next({
        status: 404,
        message: `Dish id not found: ${req.params.dishId}`,
    });
}


function read(req, res) {
    res.json({ data: res.locals.dish });
}

function hasDish(req, res, next) {
    const { name } = req.body.data;
    if (name) {
        return next();
    }
    next({ status: 400, message: "A name is required." });
}

function update(req, res, next) {
    const paramDishId = req.params.dishId;
    const storeDishId = req.body.data.id;

    if( storeDishId && (storeDishId !== paramDishId))
    {
        return next(
            {status: 400, message: `Dish id ${storeDishId} does not match ${paramDishId}`})
    }

    const foundDish = dishes.find((dish) => dish.id == paramDishId);
    const { data: { id, name, description, price, image_url } = {} } = req.body;

    foundDish.name = name;
    foundDish.description = description;
    foundDish.price = price;
    foundDish.image_url = image_url;
    foundDish.id = paramDishId;

    res.json({ data: foundDish });
}


module.exports = {
    list,
    create:[
        bodyDataHas("name"),
        bodyDataHas("description"),
        bodyDataHas("price"),
        priceIsValidNumber,
        bodyDataHas("image_url"),
        create,
    ],
    read:[dishExists, read],
    update:[
        dishExists,
        bodyDataHas("name"),
        bodyDataHas("description"),
        bodyDataHas("price"),
        priceIsValidNumber,
        bodyDataHas("image_url"),
        hasDish,
        update],
}