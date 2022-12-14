const Sauce = require("../models/Sauce");
const fs = require("fs");

//Création sauce: récupère les champs et supprime les espaces du debut et de fin
exports.createSauce = (req, res, next) => {
  const sauceObject = JSON.parse(req.body.sauce);
  delete sauceObject._id;
  delete sauceObject.userId;

  const newSauce = new Sauce({
    name: sauceObject.name.trim(),
    manufacturer: sauceObject.manufacturer.trim(),
    description: sauceObject.description.trim(),
    mainPepper: sauceObject.mainPepper.trim(),
    heat: sauceObject.heat,
    userId: req.auth.userId,
    imageUrl: `${req.protocol}://${req.get("host")}/images/${
      req.file.filename
    }`,
    likes: 0,
    dislikes: 0,
    usersLiked: [],
    usersdisLiked: [],
  });
  newSauce
    .save()
    .then(() => {
      res.status(201).json({ message: "Sauce enregistrée" });
    })
    .catch((error) => {
      res.status(400).json({ error });
    });
};

// Récupère une sauce précise
exports.getOneSauce = (req, res, next) => {
  Sauce.findOne({
    _id: req.params.id,
  })
    .then((oneSauce) => {
      res.status(200).json(oneSauce);
    })
    .catch((error) => {
      res.status(404).json({
        error: error,
      });
    });
};

//Modifier la sauce et verifie si userdId ok
exports.modifySauce = (req, res, next) => {
  Sauce.findOne({ _id: req.params.id }).then((sauce) => {
    if (sauce.userId !== req.auth.userId) {
      res.status(403).JSON({ message: "not authorized" });
    }
    const filename = sauce.imageUrl.split("/images/")[1];
    const regexForm=/^\s|\s$/
    const sauceObject = req.body
    if(regexForm.test(sauceObject.name) || regexForm.test(sauceObject.manufacturer)|| regexForm.test(sauceObject.description)|| regexForm.test(sauceObject.mainPepper)){
      res.status(400).json({message:"erreur:vous ne pouvez pas commencer et finir avec un espace"})
      console.log(regexForm.test(sauceObject.name))
    }else{
      fs.unlink(`images/${filename}`, () => {
        const sauceObject = req.file
          ? {
              ...JSON.parse(req.body.sauce),
              imageUrl: `${req.protocol}://${req.get("host")}/images/${
                req.file.filename
              }`,
            }
          : { ...req.body };
        Sauce.updateOne(
          { _id: req.params.id },
          { ...sauceObject, _id: req.params.id }
        )
          .then(() => res.status(200).json({ message: "Sauce mise à jour !" }))
          .catch((error) => res.status(400).json({ error }));
      }); 
    }

  });
};

// supprime la sauce et verifie userdId de la sauce si ok
exports.deleteSauce = (req, res, next) => {
  Sauce.findOne({ _id: req.params.id })
    .then((deleteSauce) => {
      if (deleteSauce.userId != req.auth.userId) {
        res.status(403).JSON({ message: "not authorized" });
      } else {
        const filename = deleteSauce.imageUrl.split("/images/")[1];
        fs.unlink(`images/${filename}`, () => {
          Sauce.deleteOne({ _id: req.params.id })
            .then(() => {
              res.status(200).json({ message: "sauce supprimée !" });
            })
            .catch((error) => res.status(401).json({ error }));
        });
      }
    })
    .catch((error) => {
      res.status(500).json({ error });
    });
};

// récupère toute les sauces a afficher
exports.getAllSauce = (req, res, next) => {
  Sauce.find()
    .then((sauces) => {
      res.status(200).json(sauces);
    })
    .catch((error) => {
      res.status(400).json({
        error: error,
      });
    });
};

// fonction de like et dislike de la sauce
exports.likeSauce = (req, res, next) => {
  switch (req.body.like) {
    case 1:
      Sauce.updateOne(
        { _id: req.params.id },
        {
          $inc: { likes: 1 },
          $push: { usersLiked: req.body.userId },
        }
      )
        .then(() => res.status(201).json({ message: "aime +1" }))
        .catch(() => res.status(500).json({ error }));
      break;

    case 0:
      Sauce.findOne({ _id: req.params.id })
        .then((sauce) => {
          if (sauce.usersLiked.includes(req.body.userId)) {
            Sauce.updateOne(
              { _id: req.params.id },
              { $pull: { usersLiked: req.body.userId }, $inc: { likes: -1 } }
            )
              .then(() =>
                res.status(200).json({ message: "annulation j'aime" })
              )
              .catch((error) => res.status(400).json({ error }));
          }
          if (sauce.usersDisliked.includes(req.body.userId)) {
            Sauce.updateOne(
              { _id: req.params.id },
              {
                $pull: { usersDisliked: req.body.userId },
                $inc: { dislikes: -1 },
              }
            )
              .then(() =>
                res.status(200).json({ message: "annulation j'aime pas" })
              )
              .catch((error) => res.status(400).json({ error }));
          }
        })
        .catch((error) => res.status(404).json({ error }));
      break;

    case -1:
      Sauce.updateOne(
        { _id: req.params.id },
        {
          $push: { usersDisliked: req.body.userId },
          $inc: { dislikes: +1 },
        }
      )
        .then(() => {
          res.status(200).json({ message: "j'aime pas +1" });
        })
        .catch((error) => res.status(400).json({ error }));
      break;

    default:
      console.log(error);
  }
};
