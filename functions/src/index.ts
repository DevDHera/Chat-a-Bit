import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp(functions.config().firebase);

// Start writing Firebase Functions
// https://firebase.google.com/docs/functions/typescript

export const updateLikesCount = functions.https.onRequest(
  (request, response) => {
    console.log(request.body);
    let body: any;
    if (typeof request.body === 'string') {
      body = JSON.parse(request.body);
    } else {
      body = request.body;
    }
    const postId = body.postId;
    const userId: string = body.userId;
    const action = body.action; // 'like' or 'unlike'

    admin
      .firestore()
      .collection('posts')
      .doc(postId)
      .get()
      .then((data: any) => {
        let likesCount = data.data().likesCount || 0;
        const likes = data.data().likes || [];
        const updateData: { likesCount: number; likes: string[] } = {
          likesCount: likesCount,
          likes: likes
        };
        if (action === 'like') {
          updateData['likesCount'] = ++likesCount;
          updateData['likes'].push(userId);
        } else {
          updateData['likesCount'] = --likesCount;
          updateData['likes'].splice(updateData['likes'].indexOf(userId), 1);
        }
        admin
          .firestore()
          .collection('posts')
          .doc(postId)
          .update(updateData)
          .then(() => {
            response.status(200).send('Done');
          })
          .catch(error => {
            response.status(error.code).send(error.message);
          });
      })
      .catch(error => {
        response.status(error.code).send(error.message);
      });
  }
);
