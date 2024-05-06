// movieMicroservice.js
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const { Kafka } = require('kafkajs');
// Charger le fichier movie.proto
const movieProtoPath = 'movie.proto';
const movieProtoDefinition = protoLoader.loadSync(movieProtoPath, {
keepCase: true,
longs: String,
enums: String,
defaults: true,
oneofs: true,
});
const movieProto = grpc.loadPackageDefinition(movieProtoDefinition).movie;
// Configuration du client Kafka
const kafka = new Kafka({
    clientId: 'movie-service',
    brokers: ['localhost:9092']
});

// Création d'un producteur Kafka
const producer = kafka.producer();

// Fonction pour envoyer un message au topic Kafka
const sendMessage = async (topic, message) => {
    try {
        await producer.send({
            topic,
            messages: [
                { value: JSON.stringify(message) }
            ]
        });
        console.log('Message Kafka envoyé avec succès');
    } catch (error) {
        console.error('Erreur lors de l\'envoi du message Kafka:', error);
    }
};

// Connexion du producteur Kafka
const connectProducer = async () => {
    await producer.connect();
    console.log('Producteur Kafka connecté');
};

// Déconnexion du producteur Kafka
const disconnectProducer = async () => {
    await producer.disconnect();
    console.log('Producteur Kafka déconnecté');
};

// Implémenter le service movie
const movieService = {
getMovie: (call, callback) => {
// Récupérer les détails du film à partir de la base de données
const movie = {
id: call.request.movie_id,
title: 'Exemple de film',
description: 'Ceci est un exemple de film.',
// Ajouter d'autres champs de données pour le film au besoin
};
callback(null, { movie });
},

searchMovies: (call, callback) => {
const { query } = call.request;
// Effectuer une recherche de films en fonction de la requête
const movies = [
{
id: '1',
title: 'Exemple de film 1',
description: 'Ceci est le premier exemple de film.',
},
{
id: '2',
title: 'Exemple de film 2',
description: 'Ceci est le deuxième exemple de film.',
},
// Ajouter d'autres résultats de recherche de films au besoin
];
callback(null, { movies });
},

createMovie:async (call, callback) => {
    const { title, description } = call.request;
    // Créer un nouveau film dans la base de données ou effectuer toute autre opération nécessaire
    const movie = {
        id: '3', // TODO don't forget to make ID dynamic
        title,
        description,
        // Ajouter d'autres champs de données pour le film au besoin
    };

    // Envoyer un message au topic Kafka lors de l'ajout d'un film
    await sendMessage('movies-topic', movie);
    callback(null, { movie });},
// Ajouter d'autres méthodes au besoin
};
// Créer et démarrer le serveur gRPC
const server = new grpc.Server();
server.addService(movieProto.MovieService.service, movieService);
const port = 50051;
server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(),
(err, port) => {
if (err) {
console.error('Échec de la liaison du serveur:', err);
return;
}
console.log(`Le serveur s'exécute sur le port ${port}`);
server.start();
 // Connexion du producteur Kafka après le démarrage du serveur
 connectProducer();
});
console.log(`Microservice de films en cours d'exécution sur le port ${port}`);

// Gestion des signaux de terminaison pour arrêter proprement le serveur et déconnecter le producteur Kafka
process.on('SIGINT', async () => {
    console.log('Signal d\'interruption reçu, arrêt du serveur...');
    await server.tryShutdown(() => {
        console.log('Serveur arrêté');
    });
    await disconnectProducer();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('Signal de terminaison reçu, arrêt du serveur...');
    await server.tryShutdown(() => {
        console.log('Serveur arrêté');
    });
    await disconnectProducer();
    process.exit(0);
});