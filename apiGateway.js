// apiGateway.js
const express = require('express');
const bodyParser = require('body-parser');
const { ApolloServer } = require('apollo-server-express');
const { graphqlHTTP } = require('express-graphql');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const mongoose = require('mongoose');

// MongoDB Movie model
const Movie = require('./models/Movie');

// Load GraphQL type definitions
const typeDefs = require('./schema');

// Load GraphQL resolvers
const resolvers = require('./resolvers');

// Load gRPC proto definitions
const movieProtoPath = 'movie.proto';
const movieProtoDefinition = protoLoader.loadSync(movieProtoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});
const movieProto = grpc.loadPackageDefinition(movieProtoDefinition).movie;

// Create Express app
const app = express();
app.use(bodyParser.json());

// Connect to MongoDB
const connectToMongoDB = async () => {
    try {
        await mongoose.connect('mongodb://localhost:27017/mydatabase', { useNewUrlParser: true, useUnifiedTopology: true });
        console.log('Connected to MongoDB');
    } catch (err) {
        console.error('Error connecting to MongoDB:', err);
    }
};

// REST endpoint for creating movies
app.post('/movies', async (req, res) => {
    try {
        const { title, description } = req.body;
   
        const movie = new Movie({ title, description });
        await movie.save();
        res.status(201).json(movie);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// GraphQL server setup
const apolloServer = new ApolloServer({ typeDefs, resolvers });

// Await server.start() before applying middleware
const startApolloServer = async () => {
    try {
        await apolloServer.start();
        apolloServer.applyMiddleware({ app });
    } catch (err) {
        console.error('Error starting Apollo Server:', err);
    }
};

// gRPC client setup
const movieClient = new movieProto.MovieService('localhost:50051', grpc.credentials.createInsecure());

// REST endpoint for creating movies using gRPC
app.post('/movies/grpc', (req, res) => {
    const { title, description } = req.body;
    movieClient.createMovie({ title, description }, (err, response) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.status(201).json(response.movie);
        }
    });
});

// GraphQL endpoint for creating movies using gRPC
app.use('/graphql/grpc', graphqlHTTP({
    schema: typeDefs,
    rootValue: resolvers,
    graphiql: true,
}));

// GraphQL endpoint for creating movies using gRPC
app.use('/graphql/movies', graphqlHTTP({
    schema: typeDefs,
    rootValue: resolvers,
    graphiql: true,
}));


const port = 3000;
const startServer = async () => {
    try {
        await connectToMongoDB();
        await startApolloServer();
        app.listen(port, () => {
            console.log(`API Gateway en cours d'exécution sur le port ${port}`);
        });
    } catch (err) {
        console.error('Error starting server:', err);
    }
};

startServer();