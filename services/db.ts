import { db, storage } from './firebase';
import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getBlob, deleteObject } from 'firebase/storage';
import { Course } from '../types';

// --- Firestore for Courses ---

export const getCourses = async (userId: string): Promise<Course[]> => {
    const coursesCol = collection(db, 'users', userId, 'courses');
    const courseSnapshot = await getDocs(coursesCol);
    const courseList = courseSnapshot.docs.map(doc => doc.data() as Course);
    return courseList;
};

export const saveCourse = async (userId: string, course: Course): Promise<void> => {
    const courseRef = doc(db, 'users', userId, 'courses', course.id);
    // await setDoc(courseRef, course, { merge: true });
    console.log("Saving disabled as per user request. Course data:", course);
};

export const deleteCourseFromDb = async (courseId: string): Promise<void> => {
    // This is a placeholder. Deletion should be handled server-side via a function
    // or requires knowledge of the current user's ID.
    // In the App.tsx logic, we'll call a more specific function.
    console.log(`Request to delete course ${courseId}`);
};


// --- Firebase Storage for Files ---

export const saveSourceFile = async (key: string, file: File): Promise<string> => {
    const fileRef = ref(storage, key);
    await uploadBytes(fileRef, file);
    return key; // The key is the full path, which serves as the reference
};

export const getSourceFile = async (key: string): Promise<Blob | undefined> => {
    try {
        const fileRef = ref(storage, key);
        const blob = await getBlob(fileRef);
        return blob;
    } catch (error) {
        console.error("Error fetching file from Firebase Storage:", error);
        return undefined;
    }
};

export const deleteSourceFiles = async (userId: string, keys: string[]): Promise<void> => {
    const deletePromises = keys.map(key => {
        const fileRef = ref(storage, key);
        return deleteObject(fileRef);
    });
    await Promise.all(deletePromises);
};

// Helper to convert blob back to file for processing
export const blobToFile = (blob: Blob, fileName: string): File => {
    return new File([blob], fileName, { type: blob.type });
};