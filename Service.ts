/**
 * This is the REST entry point for the project.
 * Restify is configured here.
 */

import restify = require('restify');

import Log from "../Util";
import {InsightResponse} from "../controller/IInsightFacade";
import InsightFacade from "../controller/InsightFacade";

/**
 * This configures the REST endpoints for the server.
 */
export default class Service {

    // The next two methods handle the echo service.

    public static echo(req: restify.Request, res: restify.Response, next: restify.Next) {
        // Log.trace('Server::echo(..) - params: ' + JSON.stringify(req.params));
        try {
            let result = Service.performEcho(req.params.msg);
            // Log.info('Server::echo(..) - responding ' + result.code);
            res.json(result.code, result.body);
        } catch (err) {
            // Log.error('Server::echo(..) - responding 400');
            res.json(400, {error: err.message});
        }
        return next();
    }

    public static performEcho(msg: string): InsightResponse {
        if (typeof msg !== 'undefined' && msg !== null) {
            return {code: 200, body: {message: msg + '...' + msg}};
        } else {
            return {code: 400, body: {error: 'Message not provided'}};
        }
    }

    // Handles service for adding datasets in raw buffer format by ID

    static addDataset(req: restify.Request, res: restify.Response, next: restify.Next) {
        // Log.trace('Server::add(..) - params: ' + JSON.stringify(req.params));
        try {
            let inFac = new InsightFacade();

            // extract parameters to add dataset
            let id = req.params.id;
            let b64Zip = new Buffer(req.params.body).toString('base64');

            // add the dataset with the facade
            let result = inFac.addDataset(id, b64Zip).then(function (response) {
                // Log.info('Server::add(..) - responding ' + response.code);
                res.json(response.code, response.body);

                return next();

            }).catch(function (err) {
                // Log.info('Server::add(..) - responding ' + err.code);
                // Log.warn(err.body.error);
                res.json(err.code, err.body);

                return next();
            });

        } catch (err) {
            // Log.error('Server::add(..) - responding ' + err.code);
            res.json(400, {error: err.message});
        }

    }

    // Handles service for deleting datasets by ID

    static delDataset(req: restify.Request, res: restify.Response, next: restify.Next) {
        // Log.trace('Server::del(..) - params: ' + JSON.stringify(req.params));
        try {
            let inFac = new InsightFacade();

            // extract parameters to add dataset
            let id = req.params.id;

            // add the dataset with the facade
            let result = inFac.removeDataset(id).then(function (response) {
                // Log.info('Server::del(..) - responding ' + response.code);
                res.json(response.code, response.body);

                return next();

            }).catch(function (err) {
                // Log.warn('Server::del(..) - throwing ' + err.code);
                // Log.warn(err.body.error);
                res.json(err.code, err.body);

                return next();
            });

        } catch (err) {
            // Log.error('Server::del(..) - responding ' + err.code);
            res.json(400, {error: err.message});
        }
    }

    // Handles service for performing a query

    static postQuery(req: restify.Request, res: restify.Response, next: restify.Next) {
        // Log.trace('Server::query(..) - params: ' + JSON.stringify(req.params));

        try {
            let inFac = new InsightFacade();

            // extract parameters to add dataset
            let query = req.body;

            // add the dataset with the facade
            let result = inFac.performQuery(query).then(function (response) {
                // Log.info('Server::query(..) - responding ' + response.code);
                res.json(response.code, response.body);

                return next();

            }).catch(function (err) {
                // Log.warn('Server::query(..) - throwing ' + err.code);
                // Log.warn(err.body.error);
                res.json(err.code, err.body);

                return next();
            });

        } catch (err) {
            // Log.error('Server::del(..) - responding ' + err.code);
            res.json(400, {error: err.message});
        }
    }
}
