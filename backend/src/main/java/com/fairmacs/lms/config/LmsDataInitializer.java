package com.fairmacs.lms.config;

import com.fairmacs.lms.entity.Category;
import com.fairmacs.lms.entity.Course;
import com.fairmacs.lms.entity.Lesson;
import com.fairmacs.lms.entity.Module;
import com.fairmacs.lms.repository.CategoryRepository;
import com.fairmacs.lms.repository.CourseRepository;
import com.fairmacs.lms.repository.ModuleRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.ArrayList;

@Component
public class LmsDataInitializer implements CommandLineRunner {

    private final CategoryRepository categoryRepository;
    private final CourseRepository courseRepository;
    private final ModuleRepository moduleRepository;

    public LmsDataInitializer(
            CategoryRepository categoryRepository,
            CourseRepository courseRepository,
            ModuleRepository moduleRepository) {

        this.categoryRepository = categoryRepository;
        this.courseRepository = courseRepository;
        this.moduleRepository = moduleRepository;
    }

    @Override
    public void run(String... args) {

        /*
         * Development seed only.
         *
         * This creates data only when the LMS catalog is empty.
         * Existing users and existing LMS data are not deleted.
         */

        if (categoryRepository.count() > 0 ||
            courseRepository.count() > 0) {

            return;
        }

        createDevelopmentCatalog();

        System.out.println("========================================");
        System.out.println("LMS development catalog initialized.");
        System.out.println("========================================");
    }

    private void createDevelopmentCatalog() {

        // -------------------------------------------------
        // CATEGORY
        // -------------------------------------------------

        Category category = new Category();

        category.setSlug("import-fundamentals");
        category.setName("Import – Fundamentals");
        category.setDescription(
                "Foundation-level introduction to import operations."
        );
        category.setIcon("ship");
        category.setSortOrder(1);
        category.setFoundationTrack(true);

        category = categoryRepository.save(category);


        // -------------------------------------------------
        // COURSE
        // -------------------------------------------------

        Course course = new Course();

        course.setCourseId("IMP-FND-001");
        course.setTitle("Import Fundamentals");
        course.setCategory("Import – Fundamentals");
        course.setCatalogCategory(category);
        course.setFoundation(true);

        course.setDescription(
                "Introduction to the import process, documentation, " +
                "and key operational concepts."
        );

        course.setLevel("Beginner");
        course.setDuration("30 minutes");
        course.setDurationHours(0.5);
        course.setRating(0.0);
        course.setEnrolledCount(0);
        course.setPassingScore(70);
        course.setActive(true);

        course.setModules(new ArrayList<>());

        course = courseRepository.save(course);


        // -------------------------------------------------
        // MODULE 1
        // -------------------------------------------------

        Module module1 = new Module();

        module1.setModuleId("IMP-FND-001-M01");
        module1.setTitle("Introduction to Import Operations");
        module1.setOrderIndex(1);
        module1.setCourse(course);
        module1.setLessons(new ArrayList<>());

        module1.getLessons().add(
                createLesson(
                        "IMP-FND-001-M01-L01",
                        "Introduction to Import",
                        "VIDEO",
                        "https://www.youtube.com/watch?v=CgrKk5MiTvQ&t=106s",
                        "10:11",
                        1,
                        module1
                )
        );

        module1.getLessons().add(
                createLesson(
                        "IMP-FND-001-M01-L02",
                        "Import Process Overview",
                        "VIDEO",
                        "https://www.youtube.com/watch?v=CgrKk5MiTvQ&t=106s",
                        "07:00",
                        2,
                        module1
                )
        );

        module1.getLessons().add(
                createLesson(
                        "IMP-FND-001-M01-L03",
                        "Key Import Concepts",
                        "PDF",
                        "https://www.youtube.com/watch?v=CgrKk5MiTvQ&t=106s",
                        "10:11",
                        3,
                        module1
                )
        );

        module1 = moduleRepository.save(module1);


        // -------------------------------------------------
        // MODULE 2
        // -------------------------------------------------

        Module module2 = new Module();

        module2.setModuleId("IMP-FND-001-M02");
        module2.setTitle("Import Documentation");
        module2.setOrderIndex(2);
        module2.setCourse(course);
        module2.setLessons(new ArrayList<>());

        module2.getLessons().add(
                createLesson(
                        "IMP-FND-001-M02-L01",
                        "Import Documents",
                        "VIDEO",
                        "https://www.youtube.com/watch?v=CgrKk5MiTvQ&t=106s",
                        "06:00",
                        1,
                        module2
                )
        );

        module2.getLessons().add(
                createLesson(
                        "IMP-FND-001-M02-L02",
                        "Bill of Entry",
                        "PDF",
                        "https://www.youtube.com/watch?v=CgrKk5MiTvQ&t=106s",
                        null,
                        2,
                        module2
                )
        );

        module2 = moduleRepository.save(module2);


        // -------------------------------------------------
        // ADD MODULES TO COURSE
        // -------------------------------------------------

        course.getModules().add(module1);
        course.getModules().add(module2);

        courseRepository.save(course);
    }


    private Lesson createLesson(
            String lessonId,
            String title,
            String type,
            String contentUrl,
            String duration,
            Integer orderIndex,
            Module module) {

        Lesson lesson = new Lesson();

        lesson.setLessonId(lessonId);
        lesson.setTitle(title);
        lesson.setType(type);
        lesson.setContentUrl(contentUrl);
        lesson.setDuration(duration);
        lesson.setOrderIndex(orderIndex);
        lesson.setModule(module);

        return lesson;
    }
}