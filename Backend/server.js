import { userRoutes, sessionRouter } from '../Backend/UserBackend/src/routes/index';
import { PORT, NODE_ENV, MONGO_URI, SESS_NAME, SESS_SECRET, SESS_LIFETIME } from "./config";
import session from 'express-session';
import connectStore from 'connect-mongo';
const request = require('request');

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const path = require('path');

require('dotenv').config();

(async() => {

    const app = express();
    app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        next();
    });
    app.get('/uploads/', (req, res) => {
        request({ url: '' },
            (error, response, body) => {
                if (error || response.statusCode !== 200) {
                    return res.status(500).json({ type: 'error', message: err.message });
                }

                res.json(JSON.parse(body));
            }
        )
    });
    const port = process.env.PORT || 8000;


    app.use(cors());
    app.use(express.json());
    app.use(bodyParser.urlencoded({ extended: true }))
    app.use(bodyParser.json());

    app.use(express.static(path.join(__dirname, '../FrontEnd/public/uploads', 'uploads')))

    const uri = process.env.ATLAS_URI;
    await mongoose.connect(uri, { useUnifiedTopology: true, useNewUrlParser: true, useCreateIndex: true });

    const connection = mongoose.connection;
    connection.once('open', () => {
        console.log("Mongo database Successfully connected");
    })

    const MongoStore = connectStore(session);

    app.disabled('x-powered-by');

    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());
    app.use(session({
        name: SESS_NAME,
        secret: SESS_SECRET,
        saveUninitialized: true,
        resave: false,
        store: new MongoStore({
            mongooseConnection: mongoose.connection,
            collection: 'session',
            ttl: parseInt(SESS_LIFETIME)
        }),
        cookie: {
            sameSite: true,
            secure: NODE_ENV === 'production',
            maxAge: parseInt(SESS_LIFETIME)
        }
    }));

    const corsOptions = {
        origin: 'http://localhost:5000',
        credentials: true,
        optionsSuccessStatus: 200
    };

    app.use(cors(corsOptions));


    const categoriesRouter = require('../Backend/AdminBackend/routes/categories.js');
    const managersRouter = require('../Backend/AdminBackend/routes/managers');
    const addItemRouter = require('../Backend/AdminBackend/routes/additem');

    const apiRouter = express.Router();
    app.use('/api', apiRouter);
    //user
    app.use('/api/products', require('../Backend/UserBackend/src/routes/products'));
    app.use('/api/cart', require('../Backend/UserBackend/src/routes/cart'));
    app.use('/api/WishList', require('../Backend/UserBackend/src/routes/wishlist'));

    //Admin
    app.use('/category', categoriesRouter);
    app.use('/managers', managersRouter);

    //Manager
    app.use('/additem', addItemRouter);

    //sessions
    apiRouter.use('/users', userRoutes);
    apiRouter.use('/session', sessionRouter);

    //Setting file path
    if (process.env.NODE_ENV === 'production') {
        app.use(express.static(__dirname + "/../FrontEnd/build"))
    }

    app.get('*', (req, res) => {
        res.sendFile(
            path.resolve(__dirname + "/../", "FrontEnd", "build", "index.html")
        )
    })


    //listening to port
    app.listen(port, () => {
        console.log(`Server is running on port:  ${port}`);
    })
})();