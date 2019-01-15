module.exports = function(sequelize, db) {

  const p = sequelize.define("profile",
    {
      id: {
        type: db.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      title: {
        type: db.STRING,
        defaultValue: "New Profile"
      },
      subtitle: {
        type: db.TEXT,
        defaultValue: "New Subtitle"
      },
      slug: {
        type: db.STRING,
        defaultValue: "new-profile-slug"
      },
      ordering: db.INTEGER,
      dimension: db.STRING,
      label: {
        type: db.STRING,
        defaultValue: "New Profile Label"
      }
    },
    {
      freezeTableName: true,
      timestamps: false
    }
  );

  p.associate = models => {
    p.hasMany(models.topic, {foreignKey: "profile_id", sourceKey: "id", as: "topics"});
    p.hasMany(models.generator, {foreignKey: "profile_id", sourceKey: "id", as: "generators"});
    p.hasMany(models.materializer, {foreignKey: "profile_id", sourceKey: "id", as: "materializers"});
  };

  return p;

};
