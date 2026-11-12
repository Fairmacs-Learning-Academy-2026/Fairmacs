
package com.fairmacs.lms.config;

import com.fairmacs.lms.entity.Department;
import com.fairmacs.lms.repository.DepartmentRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class DepartmentDataInitializer implements CommandLineRunner {

    private final DepartmentRepository departmentRepository;

    public DepartmentDataInitializer(
            DepartmentRepository departmentRepository) {
        this.departmentRepository = departmentRepository;
    }

    @Override
    public void run(String... args) {

        // Never seed over an existing department master.
        // Existing records will be migrated separately.
        if (departmentRepository.count() > 0) {
            System.out.println(
                    "Department master already contains records. "
                    + "Skipping department initialization."
            );
            return;
        }

        List<DepartmentData> departments = List.of(
                new DepartmentData(
                        "People Operations",
                        "People Operations and employee administration."
                ),
                new DepartmentData(
                        "Accounts",
                        "Accounting, billing, payments and finance."
                ),
                new DepartmentData(
                        "Admin",
                        "Administrative and workplace support."
                ),
                new DepartmentData(
                        "Operations",
                        "Import, export and freight forwarding operations."
                ),
                new DepartmentData(
                        "Documentation",
                        "Shipping documents and document processing."
                ),
                new DepartmentData(
                        "Customer Service",
                        "Customer communication and service management."
                ),
                new DepartmentData(
                        "Pricing",
                        "Freight pricing, quotations and rate management."
                ),
                new DepartmentData(
                        "Sales",
                        "Sales, business development and customer acquisition."
                ),
                new DepartmentData(
                        "Information Technology",
                        "Information technology, software, and systems infrastructure."
                ),
                new DepartmentData(
                        "General",
                        "Common training applicable across departments."
                )
        );

        for (DepartmentData data : departments) {
            Department department = new Department();
            department.setName(data.name());
            department.setDescription(data.description());
            department.setEmployeeCount(0);
            department.setActiveCoursesCount(0);
            department.setCompletionRate(0.0);

            departmentRepository.save(department);
        }

        System.out.println(
                "Initialized " + departments.size()
                + " Fairmacs departments."
        );
    }

    private record DepartmentData(
            String name,
            String description
    ) {
    }
}
