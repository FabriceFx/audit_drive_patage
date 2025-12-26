# Audit & nettoyage des Drives partagés (Shared Drives)

![License MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Platform](https://img.shields.io/badge/Platform-Google%20Apps%20Script-green)
![Runtime](https://img.shields.io/badge/Google%20Apps%20Script-V8-green)
![Author](https://img.shields.io/badge/Auteur-Fabrice%20Faucheux-orange)

## 📋 Description
Ce projet Google Apps Script est un outil d'administration pour Google Workspace. Il audite une liste définie de Drives Partagés pour identifier les espaces de stockage inactifs ("Drives Zombies").

## 🚀 Fonctionnalités clés
* **Analyse d'activité performante** : Utilise le service avancé *Drive API* pour déterminer la date réelle de dernière modification sans parcourir récursivement tous les fichiers.
* **Inventaire automatisé** : Génère un Spreadsheet unique pour chaque Drive, listant le contenu à la racine (Dossiers et Fichiers).
* **Alerte "anti-zombie"** : Déclenche une notification email (HTML) listant les Drives abandonnés avec liens directs vers les rapports.
* **Mode batch** : Traite les données par lots pour respecter les quotas d'exécution Google.

## ⚙️ Configuration du script

Le comportement du script est piloté par la constante `CONFIG` en début de fichier `Code.js` :

| Paramètre | Description | Valeur par défaut |
| :--- | :--- | :--- |
| `NOM_ONGLET_DONNEES` | Nom de l'onglet contenant les IDs | `'Liste_SharedDrives'` |
| `SEUIL_INACTIVITE_MOIS` | Nombre de mois sans activité avant alerte | `6` |
| `EMAIL_DESTINATAIRE` | Email recevant le rapport d'alerte | Votre email (Session active) |

## 🛠️ Installation manuelle

### 1. Préparation du spreadsheet
1.  Créer un nouveau **Google Sheet**.
2.  Renommer l'onglet principal en `Liste_SharedDrives`.
3.  En cellule **A1**, mettre l'entête `ID Drive`.
4.  Coller les IDs des Drives Partagés à auditer dans la colonne **A** (à partir de la ligne 2).

### 2. Installation du code
1.  Ouvrir l'éditeur de script : `Extensions` > `Apps Script`.
2.  Copier le contenu du fichier `Code.js` dans l'éditeur.

### 3. Activation des services (CRITIQUE)
Pour que le script fonctionne, vous devez activer le Service Avancé Drive :
1.  Dans la barre latérale gauche de l'éditeur, cliquer sur le `+` à côté de **Services**.
2.  Sélectionner **Drive API** (et non DriveActivity API).
3.  Cliquer sur **Ajouter**.
    * *Note : Le service GmailApp est activé automatiquement lors de la demande de permission.*

### 4. Première exécution
1.  Sauvegarder le script (`Ctrl + S`).
2.  Rafraîchir le Spreadsheet.
3.  Via le menu `⚙️ Scanner Drives` > `Lancer l'audit complet`.
4.  Accepter les demandes d'autorisation (Accès aux fichiers et Envoi d'email).

## 📦 Livrables générés
* **Dans le Sheet Maître** : Remplissage des colonnes B à F (Lien Rapport, Date Audit, Nom Drive, Dernier Auteur, Date Modif).
* **Fichiers Drive** : Création d'un Spreadsheet d'inventaire pour chaque Drive audité.
* **Email** : Envoi d'un récapitulatif si des inactivités sont détectées.
