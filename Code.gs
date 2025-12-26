/**
 * @file AuditSharedDrives.gs
 * @description Script d'audit et de nettoyage des Drives Partagés inactifs.
 * @author Fabrice Faucheux
 */

// ----------------------------------------------------------------------------
// CONFIGURATION & CONSTANTES
// ----------------------------------------------------------------------------

const CONFIG = {
  NOM_ONGLET_DONNEES: 'Liste_SharedDrives',
  LIGNE_ENTETE: 1,
  COLONNE_ID: 1,
  NB_COLONNES_RESULTATS: 5,
  // --- Nouveaux Paramètres ---
  SEUIL_INACTIVITE_MOIS: 6, // Alerte si inactif depuis plus de 6 mois
  EMAIL_DESTINATAIRE: Session.getActiveUser().getEmail(), // Par défaut : votre email
  SUJET_EMAIL: "⚠️ Alerte : Drives Partagés Inactifs détectés"
};

/**
 * Crée le menu personnalisé.
 */
const onOpen = () => {
  SpreadsheetApp.getUi()
    .createMenu('⚙️ Scanner Drives')
    .addItem("Lancer l'audit complet", 'scannerLesDrivesPartages')
    .addToUi();
};

/**
 * Fonction principale : Orchestre l'audit et l'envoi d'alertes.
 */
const scannerLesDrivesPartages = () => {
  const classeur = SpreadsheetApp.getActiveSpreadsheet();
  const feuille = classeur.getSheetByName(CONFIG.NOM_ONGLET_DONNEES);

  if (!feuille) {
    SpreadsheetApp.getUi().alert(`Erreur : Onglet "${CONFIG.NOM_ONGLET_DONNEES}" introuvable.`);
    return;
  }

  const derniereLigne = feuille.getLastRow();
  if (derniereLigne <= CONFIG.LIGNE_ENTETE) {
    SpreadsheetApp.getUi().alert("Aucune donnée à traiter.");
    return;
  }

  // Récupération des IDs
  const listeIds = feuille.getRange(
    CONFIG.LIGNE_ENTETE + 1, 
    CONFIG.COLONNE_ID, 
    derniereLigne - CONFIG.LIGNE_ENTETE, 
    1
  ).getValues().flat();

  // Tableau pour collecter les "Zombies" (Inactifs)
  let drivesInactifs = [];

  // Date limite pour le calcul d'inactivité
  const dateLimite = new Date();
  dateLimite.setMonth(dateLimite.getMonth() - CONFIG.SEUIL_INACTIVITE_MOIS);

  // --- TRAITEMENT DES DRIVES ---
  const resultatsAudit = listeIds.map(idDrive => {
    if (!idDrive) return Array(CONFIG.NB_COLONNES_RESULTATS).fill("");

    try {
      console.log(`Traitement du Drive ID : ${idDrive}`);
      
      const infoDrive = recupererInfoDrive(idDrive);
      const derniereActivite = recupererDerniereActivite(idDrive);
      const urlRapport = genererRapportRacine(idDrive, infoDrive.name);

      // Vérification de l'inactivité
      // Si la date d'activité est antérieure à la date limite
      if (derniereActivite.objetDate && derniereActivite.objetDate < dateLimite) {
        drivesInactifs.push({
          nom: infoDrive.name,
          date: derniereActivite.dateLisible,
          auteur: derniereActivite.auteur,
          url: urlRapport
        });
      }

      return [
        urlRapport,
        new Date(),
        infoDrive.name,
        derniereActivite.auteur,
        derniereActivite.objetDate // On stocke l'objet Date pour le tri éventuel dans le Sheet
      ];

    } catch (erreur) {
      console.error(`Erreur Drive ${idDrive}: ${erreur.message}`);
      return [`ERREUR: ${erreur.message}`, new Date(), "Inconnu", "-", "-"];
    }
  });

  // --- ÉCRITURE DES RÉSULTATS ---
  if (resultatsAudit.length > 0) {
    feuille.getRange(
      CONFIG.LIGNE_ENTETE + 1, 
      2, 
      resultatsAudit.length, 
      CONFIG.NB_COLONNES_RESULTATS
    ).setValues(resultatsAudit);
  }

  // --- ENVOI DE L'EMAIL D'ALERTE ---
  if (drivesInactifs.length > 0) {
    envoyerEmailAlerte(drivesInactifs);
    SpreadsheetApp.getUi().alert(`✅ Audit terminé. \n📧 Une alerte a été envoyée pour ${drivesInactifs.length} drive(s) inactif(s).`);
  } else {
    SpreadsheetApp.getUi().alert("✅ Audit terminé. Aucun drive inactif détecté.");
  }
};

/**
 * Envoie un email récapitulatif formaté en HTML.
 * @param {Array<Object>} drivesInactifs - Liste des objets drives inactifs.
 */
const envoyerEmailAlerte = (drivesInactifs) => {
  const corpsHtml = `
    <h3>⚠️ Rapport de Drives Inactifs (> ${CONFIG.SEUIL_INACTIVITE_MOIS} mois)</h3>
    <p>Le script d'audit a détecté <strong>${drivesInactifs.length}</strong> Drives Partagés sans activité récente.</p>
    <table border="1" style="border-collapse: collapse; width: 100%;">
      <tr style="background-color: #f2f2f2;">
        <th style="padding: 8px;">Nom du Drive</th>
        <th style="padding: 8px;">Dernière Modif.</th>
        <th style="padding: 8px;">Dernier Auteur</th>
        <th style="padding: 8px;">Inventaire</th>
      </tr>
      ${drivesInactifs.map(d => `
        <tr>
          <td style="padding: 8px;">${d.nom}</td>
          <td style="padding: 8px;">${d.date}</td>
          <td style="padding: 8px;">${d.auteur}</td>
          <td style="padding: 8px;"><a href="${d.url}">Voir le rapport</a></td>
        </tr>
      `).join('')}
    </table>
    <p><em>Audit généré automatiquement par Google Apps Script.</em></p>
  `;

  GmailApp.sendEmail(CONFIG.EMAIL_DESTINATAIRE, CONFIG.SUJET_EMAIL, "", {
    htmlBody: corpsHtml
  });
};

// --- FONCTIONS UTILITAIRES (Inchangées ou légèrement adaptées) ---

const recupererInfoDrive = (idDrive) => Drive.Drives.get(idDrive);

const recupererDerniereActivite = (idDrive) => {
  const params = {
    corpora: 'drive',
    driveId: idDrive,
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
    q: 'trashed = false',
    orderBy: 'modifiedTime desc',
    pageSize: 1,
    fields: 'files(name, modifiedTime, lastModifyingUser(displayName, emailAddress))'
  };

  const reponse = Drive.Files.list(params);

  if (reponse.files && reponse.files.length > 0) {
    const f = reponse.files[0];
    const auteur = f.lastModifyingUser 
      ? `${f.lastModifyingUser.displayName} (${f.lastModifyingUser.emailAddress})` 
      : "Inconnu";
    
    return {
      auteur: auteur,
      objetDate: new Date(f.modifiedTime), // Pour comparaison JS
      dateLisible: new Date(f.modifiedTime).toLocaleDateString(), // Pour affichage Email
      fichier: f.name
    };
  } else {
    return { auteur: "Aucune activité", objetDate: null, dateLisible: "Jamais", fichier: "-" };
  }
};

const genererRapportRacine = (idDrive, nomDrive) => {
  // Création simplifiée pour l'exemple, voir version précédente pour détails complets
  const sheet = SpreadsheetApp.create(`Rapport - ${nomDrive}`);
  const f = sheet.getActiveSheet();
  f.appendRow(["Type", "Nom", "ID", "URL"]);
  
  const racine = DriveApp.getFolderById(idDrive);
  const data = [];
  
  const dossiers = racine.getFolders();
  while (dossiers.hasNext()) { const d = dossiers.next(); data.push(["Dossier", d.getName(), d.getId(), d.getUrl()]); }
  
  const fichiers = racine.getFiles();
  while (fichiers.hasNext()) { const fi = fichiers.next(); data.push(["Fichier", fi.getName(), fi.getId(), fi.getUrl()]); }
  
  if (data.length > 0) f.getRange(2, 1, data.length, 4).setValues(data);
  try { sheet.setSharing(DriveApp.Access.DOMAIN, DriveApp.Permission.VIEW); } catch(e) {}
  
  return sheet.getUrl();
};
