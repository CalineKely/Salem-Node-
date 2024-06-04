const express = require("express");
const sqlDbconnect = require("./dbconnect");
const Router = express.Router();


Router.post("/logVisit", (req, res) => {
  const currentDate = new Date();
  const formattedDate = currentDate.toISOString().slice(0, 16).replace("T", " ");
  const mois_visite = currentDate.getMonth() + 1;
  const annee_visite = currentDate.getFullYear();

  const logVisitSQL = `
    INSERT IGNORE INTO visiteur (heure_visite, mois_visite, annee_visite) 
    VALUES (?, ?, ?)
  `;

  sqlDbconnect.query(logVisitSQL, [formattedDate, mois_visite, annee_visite], (err, result) => {
    if (err) {
      console.error("Erreur lors de l'enregistrement de la visite:", err);
      return res.status(500).json("Erreur lors de l'enregistrement de la visite");
    }

    if (result.affectedRows === 0) {
      // Aucun nouvel enregistrement effectué (probablement doublon), retourne une erreur
      return res.status(400).json("Visite déjà enregistrée pour cette minute");
    }

    res.status(200).json("Visite enregistrée avec succès!");
  });
});


Router.post("/reserverChambre", (req, res) => {
  const { datearriver, datedepart, chambre, nom, prenom, phone, adresse, gmail } = req.body;

  // Vérification de la disponibilité de la chambre
  const checkAvailabilitySql = `
    SELECT * FROM reservation_chambre 
    WHERE chambre = ? 
    AND (
      (datearriver <= ? AND datedepart >= ?) OR 
      (datearriver <= ? AND datedepart >= ?) OR
      (datearriver >= ? AND datedepart <= ?)
    )
  `;

  sqlDbconnect.query(
    checkAvailabilitySql,
    [chambre, datedepart, datearriver, datedepart, datearriver, datearriver, datedepart],
    (err, results) => {
      if (err) {
        console.error("Erreur lors de la vérification de la disponibilité:", err);
        return res.status(500).json("Erreur lors de la vérification de la disponibilité");
      }

      if (results.length > 0) {
        return res.status(400).json("Cette chambre est déjà réservée pour les dates sélectionnées");
      }

      // Insertion des données du client
      const insertClientSQL = `INSERT INTO client (name, username, contact, adresse, gmail) VALUES (?, ?, ?, ?, ?)`;

      sqlDbconnect.query(insertClientSQL, [nom, prenom, phone, adresse, gmail], (err, result) => {
        if (err) {
          console.error("Erreur lors de l'enregistrement du client:", err);
          return res.status(500).json("Erreur lors de l'enregistrement du client");
        }

        const clientId = result.insertId;

        // Insertion de la réservation
        const insertReservationSQL = `INSERT INTO reservation_chambre (datearriver, datedepart, chambre, id_client) VALUES (?, ?, ?, ?)`;

        sqlDbconnect.query(
          insertReservationSQL,
          [datearriver, datedepart, chambre, clientId],
          (err, result) => {
            if (err) {
              console.error("Erreur lors de l'enregistrement de la réservation:", err);
              return res.status(500).json("Erreur lors de l'enregistrement de la réservation");
            }

            res.status(200).json("Réservation enregistrée avec succès!");
          }
        );
      });
    }
  );
});


Router.post("/reserverPiscine", (req, res) => {
  const { date_piscine, nom, prenom, adresse, phone, email } = req.body;

  const checkAvailabilitySql = `
    SELECT * FROM reservation_piscine 
    WHERE date_piscine = ?
  `;

  sqlDbconnect.query(checkAvailabilitySql, [date_piscine], (err, results) => {
    if (err) {
      console.error("Erreur lors de la vérification de la disponibilité:", err);
      return res.status(500).json("Erreur lors de la vérification de la disponibilité");
    }

    if (results.length > 0) {
      return res.status(400).json("La piscine est déjà réservée pour cette date");
    }

    const checkClientSQL = `SELECT id_client FROM client WHERE name = ? AND username = ? AND contact = ? AND adresse = ? AND gmail = ?`;

    sqlDbconnect.query(checkClientSQL, [nom, prenom, phone, adresse, email], (err, results) => {
      if (err) {
        console.error("Erreur lors de la vérification du client:", err);
        return res.status(500).json("Erreur lors de la vérification du client");
      }

      let clientId;

      if (results.length > 0) {
        clientId = results[0].id_client;
      } else {
        const insertClientSQL = `INSERT INTO client (name, username, contact, adresse, gmail) VALUES (?, ?, ?, ?, ?)`;

        sqlDbconnect.query(insertClientSQL, [nom, prenom, phone, adresse, email], (err, result) => {
          if (err) {
            console.error("Erreur lors de l'enregistrement du client:", err);
            return res.status(500).json("Erreur lors de l'enregistrement du client");
          }

          clientId = result.insertId;
          insertReservationPiscine(clientId);
        });
      }

      if (clientId) {
        insertReservationPiscine(clientId);
      }
    });

    function insertReservationPiscine(clientId) {
      const insertReservationSQL = `INSERT INTO reservation_piscine (date_piscine, id_client) VALUES (?, ?)`;

      sqlDbconnect.query(insertReservationSQL, [date_piscine, clientId], (err, result) => {
        if (err) {
          console.error("Erreur lors de l'enregistrement de la réservation:", err);
          return res.status(500).json("Erreur lors de l'enregistrement de la réservation");
        }

        res.status(200).json("Réservation de la piscine enregistrée avec succès!");
      });
    }
  });
});

Router.post("/reserverSalle", (req, res) => {
  const { date_salle, nom, prenom, addresse, phone, email } = req.body;

  // Vérification de la disponibilité de la salle de conférence
  const checkAvailabilitySql = `
    SELECT * FROM reservation_salle 
    WHERE date_salle = ?
  `;

  sqlDbconnect.query(checkAvailabilitySql, [date_salle], (err, results) => {
    if (err) {
      console.error("Erreur lors de la vérification de la disponibilité:", err);
      return res.status(500).json("Erreur lors de la vérification de la disponibilité");
    }

    if (results.length > 0) {
      return res.status(400).json("La salle de conférence est déjà réservée pour cette date");
    }

    // Vérification de l'existence du client
    const checkClientSQL = `SELECT id_client FROM client WHERE name = ? AND username = ? AND contact = ? AND adresse = ? AND gmail = ?`;

    sqlDbconnect.query(checkClientSQL, [nom, prenom, addresse, phone, email], (err, results) => {
      if (err) {
        console.error("Erreur lors de la vérification du client:", err);
        return res.status(500).json("Erreur lors de la vérification du client");
      }

      let clientId;

      if (results.length > 0) {
        clientId = results[0].id_client;
      } else {
        // Insertion des données du client
        const insertClientSQL = `INSERT INTO client (name, username, contact, adresse, gmail) VALUES (?, ?, ?, ?, ?)`;

        sqlDbconnect.query(insertClientSQL, [nom, prenom, addresse, phone, email], (err, result) => {
          if (err) {
            console.error("Erreur lors de l'enregistrement du client:", err);
            return res.status(500).json("Erreur lors de l'enregistrement du client");
          }

          clientId = result.insertId;

          // Insertion de la réservation
          insertReservationSalle(clientId);
        });
      }

      if (clientId) {
        // Insertion de la réservation
        insertReservationSalle(clientId);
      }
    });

    function insertReservationSalle(clientId) {
      const insertReservationSQL = `INSERT INTO reservation_salle (date_salle, id_client) VALUES (?, ?)`;

      sqlDbconnect.query(insertReservationSQL, [date_salle, clientId], (err, result) => {
        if (err) {
          console.error("Erreur lors de l'enregistrement de la réservation:", err);
          return res.status(500).json("Erreur lors de l'enregistrement de la réservation");
        }

        res.status(200).json("Réservation de la salle de conférence enregistrée avec succès!");
      });
    }
  });
});


Router.post("/ajouterCommentaire", (req, res) => {
  const {nom, prenom, phone, email, texte } = req.body;

  // Vérification de l'existence du client
  const checkClientSQL = `
    SELECT id_client FROM client 
    WHERE name = ? AND username = ? AND contact = ? AND gmail = ?
  `;

  sqlDbconnect.query(checkClientSQL, [nom, prenom, phone, email], (err, results) => {
    if (err) {
      console.error("Erreur lors de la vérification du client:", err);
      return res.status(500).json("Erreur lors de la vérification du client");
    }

    let id_client;

    if (results.length > 0) {
      id_client = results[0].id_client;
      insertCommentaire(id_client);
    } else {
      // Insertion des données du client s'il n'existe pas
      const insertClientSQL = `
        INSERT INTO client (name, username, contact, gmail) 
        VALUES (?, ?, ?, ?)
      `;

      sqlDbconnect.query(insertClientSQL, [nom, prenom, phone, email], (err, result) => {
        if (err) {
          console.error("Erreur lors de l'enregistrement du client:", err);
          return res.status(500).json("Erreur lors de l'enregistrement du client");
        }

        id_client = result.insertId;
        insertCommentaire(id_client);
      });
    }
  });

  function insertCommentaire(id_client) {
    // Insertion du commentaire avec l'id_client obtenu
    const insertCommentaireSQL = `
      INSERT INTO commentaire (texte, id_client) 
      VALUES (?, ?)
    `;

    sqlDbconnect.query(insertCommentaireSQL, [texte, id_client], (err, result) => {
      if (err) {
        console.error("Erreur lors de l'enregistrement du commentaire:", err);
        return res.status(500).json("Erreur lors de l'enregistrement du commentaire");
      }

      res.status(200).json("Commentaire enregistré avec succès!");
    });
  }
});

module.exports = Router;
